import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseSpeechOptions {
  voice?: string;
  speed?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (msg: string) => void;
}

// Split text into <= maxLen chunks at sentence boundaries
function chunkText(text: string, maxLen = 280): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return [clean];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const s of sentences) {
    if ((current + " " + s).trim().length <= maxLen) {
      current = (current + " " + s).trim();
    } else {
      if (current) chunks.push(current);
      if (s.length <= maxLen) {
        current = s;
      } else {
        // hard split very long sentence
        for (let i = 0; i < s.length; i += maxLen) {
          chunks.push(s.slice(i, i + maxLen));
        }
        current = "";
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function base64ToBlob(b64: string, type = "audio/wav"): Blob {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Module-level LRU-ish cache for recent chunks
const audioCache = new Map<string, Blob>();
const MAX_CACHE = 30;
function cacheGet(key: string) {
  const v = audioCache.get(key);
  if (v) {
    audioCache.delete(key);
    audioCache.set(key, v);
  }
  return v;
}
function cacheSet(key: string, val: Blob) {
  audioCache.set(key, val);
  if (audioCache.size > MAX_CACHE) {
    const first = audioCache.keys().next().value;
    if (first) audioCache.delete(first);
  }
}

async function fetchKokoro(
  text: string,
  voice: string,
  speed: number,
  signal: AbortSignal,
): Promise<Blob> {
  const key = `${voice}::${speed}::${text}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (signal.aborted) throw new Error("aborted");
    try {
      const { data, error } = await supabase.functions.invoke("kokoro-tts", {
        body: { text, voice, speed },
      });
      if (error) throw error;
      if (!data?.audioContent) throw new Error("No audio returned");
      const blob = base64ToBlob(
        data.audioContent,
        data.contentType ?? "audio/wav",
      );
      cacheSet(key, blob);
      return blob;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("TTS failed");
}

export const useElevenLabsSpeech = (opts: UseSpeechOptions = {}) => {
  const { voice = "af_bella", speed = 1.0, onStart, onEnd, onError } = opts;

  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);
  const lastTextRef = useRef<string>("");

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute("src");
        audioRef.current.load();
      } catch (_e) {
        /* noop */
      }
    }
    audioRef.current = null;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    cleanupAudio();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanupAudio]);

  const playBlob = useCallback(
    (blob: Blob) =>
      new Promise<void>((resolve, reject) => {
        if (cancelledRef.current) return resolve();
        cleanupAudio();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const audio = new Audio(url);
        audio.muted = isMuted;
        audio.preload = "auto";
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          if (blobUrlRef.current === url) {
            URL.revokeObjectURL(url);
            blobUrlRef.current = null;
          }
          resolve();
        };
        audio.onerror = () => {
          if (blobUrlRef.current === url) {
            URL.revokeObjectURL(url);
            blobUrlRef.current = null;
          }
          reject(new Error("Audio playback failed"));
        };

        audio.play().catch((e) => reject(e));
      }),
    [cleanupAudio, isMuted],
  );

  const speak = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) return;
      stop();
      cancelledRef.current = false;
      lastTextRef.current = text;

      const ac = new AbortController();
      abortRef.current = ac;

      setIsLoading(true);
      onStart?.();

      const chunks = chunkText(text);
      try {
        // Pre-fetch first chunk
        let nextPromise = fetchKokoro(chunks[0], voice, speed, ac.signal);

        for (let i = 0; i < chunks.length; i++) {
          if (cancelledRef.current || ac.signal.aborted) break;
          const currentBlob = await nextPromise;

          // Start fetching next chunk in parallel with playback
          if (i + 1 < chunks.length) {
            nextPromise = fetchKokoro(
              chunks[i + 1],
              voice,
              speed,
              ac.signal,
            );
          }

          if (i === 0) setIsLoading(false);
          if (cancelledRef.current) break;
          await playBlob(currentBlob);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Voice generation failed";
        if (!cancelledRef.current && msg !== "aborted") {
          onError?.(msg);
        }
      } finally {
        setIsLoading(false);
        setIsSpeaking(false);
        if (!cancelledRef.current) onEnd?.();
        abortRef.current = null;
      }
    },
    [voice, speed, onStart, onEnd, onError, playBlob, stop],
  );

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking || isLoading) {
        stop();
      } else {
        speak(text);
      }
    },
    [isSpeaking, isLoading, speak, stop],
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) speak(lastTextRef.current);
  }, [speak]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => {
      const next = !m;
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  return {
    speak,
    stop,
    toggle,
    replay,
    toggleMute,
    isMuted,
    isSpeaking,
    isLoading,
  };
};

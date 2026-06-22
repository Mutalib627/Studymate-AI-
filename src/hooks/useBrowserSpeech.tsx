import { useCallback, useEffect, useRef, useState } from "react";
import { useElevenLabsSpeech } from "@/hooks/useElevenLabsSpeech";
import { supabase } from "@/integrations/supabase/client";

interface UseBrowserSpeechOptions {
  onEnd?: () => void;
  onError?: (error: string) => void;
}

const cleanTextForSpeech = (text: string): string => {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
    .replace(/[•→←↑↓★☆●○◆◇■□▲△▼▽◀▶◁▷]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const useBrowserSpeech = (options?: UseBrowserSpeechOptions) => {
  const { speak: kokoroSpeak, stop: kokoroStop, isSpeaking, isLoading } =
    useElevenLabsSpeech({
      onEnd: options?.onEnd,
      onError: options?.onError,
    });

  const speak = useCallback((text: string) => {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;
    kokoroSpeak(cleaned);
  }, [kokoroSpeak]);

  const toggle = useCallback((text: string) => {
    if (isSpeaking || isLoading) kokoroStop();
    else speak(text);
  }, [isSpeaking, isLoading, kokoroStop, speak]);

  return {
    speak,
    stop: kokoroStop,
    toggle,
    isSpeaking,
    isSupported: true,
    voices: [] as never[],
  };
};

// ─── Detection helpers ──────────────────────────────────────────────────────

/** True if the browser natively supports the Web Speech API */
function hasWebSpeechAPI(): boolean {
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/** True if the browser can record audio via MediaRecorder */
function hasMediaRecorder(): boolean {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

// ─── MediaRecorder → OpenRouter Whisper transcription ───────────────────────

async function transcribeWithWhisper(blob: Blob): Promise<string> {
  // Convert to base64 and send to the ai-chat edge function
  // We use a small Supabase edge function helper instead of calling OpenRouter
  // directly from the browser (avoids exposing keys).
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  const { data, error } = await supabase.functions.invoke('transcribe-audio', {
    body: {
      audio: base64,
      mimeType: blob.type || 'audio/webm',
    },
  });

  if (error) throw new Error(error.message);
  return (data?.text ?? '').trim();
}

// ─── Preferred MIME type for MediaRecorder ───────────────────────────────────

function getBestMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

// ─── Hook interfaces ─────────────────────────────────────────────────────────

interface UseBrowserRecognitionOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

// ─── Web Speech API implementation (Chrome / Edge desktop + some Android) ───

function useWebSpeechRecognition(options: UseBrowserRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(options.onResult);
  const onErrorRef = useRef(options.onError);
  const isListeningRef = useRef(false);
  const sentRef = useRef(false);
  const finalResultRef = useRef("");

  useEffect(() => {
    onResultRef.current = options.onResult;
    onErrorRef.current = options.onError;
  }, [options.onResult, options.onError]);

  const clearTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  useEffect(() => {
    const API =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!API) return;

    const recognition = new API();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      sentRef.current = false;
      finalResultRef.current = "";
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      clearTimer();
      setInterimText("");
      const text = finalResultRef.current.trim();
      if (text && !sentRef.current) {
        sentRef.current = true;
        onResultRef.current(text);
      }
      finalResultRef.current = "";
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setIsListening(false);
        isListeningRef.current = false;
        return;
      }
      setIsListening(false);
      isListeningRef.current = false;
      setInterimText("");
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript = text;
        } else {
          interimTranscript = text;
        }
      }
      if (interimTranscript) setInterimText(interimTranscript);
      if (finalTranscript.trim()) {
        finalResultRef.current = finalTranscript.trim();
        setInterimText("");
        clearTimer();
        silenceTimerRef.current = setTimeout(() => {
          if (!sentRef.current && finalResultRef.current) {
            sentRef.current = true;
            onResultRef.current(finalResultRef.current);
            finalResultRef.current = "";
            try { recognition.stop(); } catch {}
          }
        }, 800);
      }
    };

    recognitionRef.current = recognition;
    return () => {
      clearTimer();
      try { recognition.abort(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    sentRef.current = false;
    finalResultRef.current = "";
    setInterimText("");
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        try { recognitionRef.current.stop(); } catch {}
        setTimeout(() => {
          sentRef.current = false;
          finalResultRef.current = "";
          try { recognitionRef.current?.start(); } catch {}
        }, 400);
      }
    }
  }, []);

  const stop = useCallback(() => {
    clearTimer();
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { start, stop, toggle, isListening, interimText };
}

// ─── MediaRecorder implementation (Firefox, Safari 14.1+, Samsung Internet) ─

function useMediaRecorderRecognition(options: UseBrowserRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const onResultRef = useRef(options.onResult);
  const onErrorRef = useRef(options.onError);

  useEffect(() => {
    onResultRef.current = options.onResult;
    onErrorRef.current = options.onError;
  }, [options.onResult, options.onError]);

  const start = useCallback(async () => {
    if (isListening || isTranscribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = getBestMimeType();
      const mr = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setIsListening(false);

        if (chunksRef.current.length === 0) return;

        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || 'audio/webm',
        });
        chunksRef.current = [];

        setIsTranscribing(true);
        setInterimText("Transcribing...");
        try {
          const text = await transcribeWithWhisper(blob);
          setInterimText("");
          if (text) {
            onResultRef.current(text);
          }
        } catch (err) {
          setInterimText("");
          onErrorRef.current?.("transcription-failed");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = mr;
      mr.start(100); // collect data every 100ms
      setIsListening(true);
      setInterimText("Recording...");
    } catch (err: any) {
      const code = err?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture';
      onErrorRef.current?.(code);
    }
  }, [isListening, isTranscribing]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else {
      // clean up stream if somehow still open
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setIsListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  return {
    start,
    stop,
    toggle,
    isListening: isListening || isTranscribing,
    interimText,
  };
}

// ─── Public hook: auto-picks the best available strategy ────────────────────

export const useBrowserRecognition = (options: UseBrowserRecognitionOptions) => {
  // Determine strategy once on mount
  const useWebSpeech = hasWebSpeechAPI();
  const useMedia = !useWebSpeech && hasMediaRecorder();
  const isSupported = useWebSpeech || useMedia;

  const webSpeech = useWebSpeechRecognition(options);
  const mediaRec = useMediaRecorderRecognition(options);

  if (useWebSpeech) {
    return { ...webSpeech, isSupported: true };
  }
  if (useMedia) {
    return { ...mediaRec, isSupported: true };
  }

  // Neither is available (very old browser)
  return {
    start: () => {},
    stop: () => {},
    toggle: () => {},
    isListening: false,
    interimText: "",
    isSupported: false,
  };
};

import { useState, useEffect, useCallback, useRef } from "react";

interface UseContinuousVoiceChatOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onSpeechDetected?: () => void;
  silenceThreshold?: number;
  minTranscriptLength?: number;
  isTTSPlaying?: boolean;
}

export const useContinuousVoiceChat = ({
  onTranscript,
  onError,
  onSpeechDetected,
  silenceThreshold = 5000,
  minTranscriptLength = 3,
  isTTSPlaying = false,
}: UseContinuousVoiceChatOptions) => {
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const isTTSPlayingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const isStartingRef = useRef(false);
  const processingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onSpeechDetectedRef = useRef(onSpeechDetected);

  // The KEY fix: store segments by index to prevent duplication
  // Map of resultIndex -> final transcript text
  const finalSegmentsRef = useRef<Map<number, string>>(new Map());

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onTranscript, onError, onSpeechDetected]);

  useEffect(() => {
    isTTSPlayingRef.current = isTTSPlaying;
    if (!isTTSPlaying && isActiveRef.current && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      setTimeout(() => tryStart(), 800);
    }
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      tryStop();
    }
  }, [isTTSPlaying]);

  const clearTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const buildFinalText = (): string => {
    // Build complete text from all stored segments in order
    const segments = Array.from(finalSegmentsRef.current.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, text]) => text);
    return segments.join(' ').trim();
  };

  const sendTranscript = useCallback(() => {
    const text = buildFinalText();
    if (text.length >= minTranscriptLength && !processingRef.current) {
      processingRef.current = true;
      onTranscriptRef.current(text);
      finalSegmentsRef.current.clear();
      setInterimText("");
      setTimeout(() => { processingRef.current = false; }, 3000);
    } else {
      finalSegmentsRef.current.clear();
      setInterimText("");
    }
  }, [minTranscriptLength]);

  const tryStart = useCallback(() => {
    if (!recognitionRef.current || isTTSPlayingRef.current || isStartingRef.current) return;
    isStartingRef.current = true;
    finalSegmentsRef.current.clear();
    setInterimText("");
    try {
      recognitionRef.current.start();
    } catch {
      isStartingRef.current = false;
    }
  }, []);

  const tryStop = useCallback(() => {
    clearTimer();
    isStartingRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  useEffect(() => {
    const API =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!API) { setIsSupported(false); return; }
    setIsSupported(true);

    const recognition = new API();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isStartingRef.current = false;
      finalSegmentsRef.current.clear();
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;

      if (isActiveRef.current && !isTTSPlayingRef.current && !shouldRestartRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isTTSPlayingRef.current && !isStartingRef.current) {
            isStartingRef.current = true;
            try { recognition.start(); }
            catch { isStartingRef.current = false; }
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      if (event.error === "aborted") return;
      if (event.error === "no-speech") {
        if (isActiveRef.current && !isTTSPlayingRef.current) {
          setTimeout(() => {
            if (isActiveRef.current && !isTTSPlayingRef.current) {
              isStartingRef.current = true;
              try { recognition.start(); }
              catch { isStartingRef.current = false; }
            }
          }, 500);
        }
        return;
      }
      if (event.error === "audio-capture" || event.error === "not-allowed") {
        onErrorRef.current?.(event.error);
        return;
      }
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current) {
            isStartingRef.current = true;
            try { recognition.start(); }
            catch { isStartingRef.current = false; }
          }
        }, 1000);
      }
    };

    recognition.onresult = (event: any) => {
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      // THE CORE FIX:
      // Each result has a unique index in event.results
      // We store final results by their index in a Map
      // This way even if onresult fires multiple times,
      // the same index always overwrites itself — no duplication

      let latestInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();

        if (result.isFinal) {
          // Store by index — overwrites if fired again for same index
          finalSegmentsRef.current.set(i, transcript);
        } else {
          // Only show the very latest interim
          latestInterim = transcript;
        }
      }

      setInterimText(latestInterim);

      // If we got any final results, reset the silence timer
      if (finalSegmentsRef.current.size > 0) {
        clearTimer();
        silenceTimerRef.current = setTimeout(() => {
          sendTranscript();
        }, silenceThreshold);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearTimer();
      try { recognition.abort(); } catch {}
    };
  }, [silenceThreshold, sendTranscript]);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    shouldRestartRef.current = false;
    processingRef.current = false;
    finalSegmentsRef.current.clear();
    setIsActive(true);
    setTimeout(() => tryStart(), 300);
  }, [tryStart]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    tryStop();
    const remaining = buildFinalText();
    if (remaining.length >= minTranscriptLength && !processingRef.current) {
      onTranscriptRef.current(remaining);
    }
    finalSegmentsRef.current.clear();
    setInterimText("");
  }, [tryStop, minTranscriptLength]);

  const toggle = useCallback(() => {
    if (isActive) deactivate();
    else activate();
  }, [isActive, activate, deactivate]);

  return { isActive, isListening, interimText, isSupported, activate, deactivate, toggle, currentTranscript: buildFinalText() };
};

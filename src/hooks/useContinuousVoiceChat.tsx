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
  const finalTextRef = useRef("");
  const isActiveRef = useRef(false);
  const isTTSPlayingRef = useRef(false);
  const shouldRestartRef = useRef(false);
  const isStartingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onSpeechDetectedRef = useRef(onSpeechDetected);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onTranscript, onError, onSpeechDetected]);

  useEffect(() => {
    isTTSPlayingRef.current = isTTSPlaying;
    if (!isTTSPlaying && isActiveRef.current && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      setTimeout(() => tryStart(), 600);
    }
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      tryStop();
    }
  }, [isTTSPlaying]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const sendTranscript = useCallback(() => {
    const text = finalTextRef.current.trim();
    if (text.length >= minTranscriptLength) {
      onTranscriptRef.current(text);
    }
    finalTextRef.current = "";
    setInterimText("");
  }, [minTranscriptLength]);

  const tryStart = useCallback(() => {
    if (
      !recognitionRef.current ||
      isTTSPlayingRef.current ||
      isStartingRef.current
    ) return;

    isStartingRef.current = true;
    finalTextRef.current = "";
    setInterimText("");

    try {
      recognitionRef.current.start();
    } catch (e: any) {
      isStartingRef.current = false;
      // Already started — ignore
    }
  }, []);

  const tryStop = useCallback(() => {
    clearSilenceTimer();
    isStartingRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const recognition = new SpeechRecognitionAPI();
    // IMPORTANT: continuous=true keeps mic open on Android
    // Do NOT call getUserMedia separately — causes audio-capture conflict
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isStartingRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;

      // Auto restart only when active and TTS not playing
      if (
        isActiveRef.current &&
        !isTTSPlayingRef.current &&
        !shouldRestartRef.current
      ) {
        setTimeout(() => {
          if (
            isActiveRef.current &&
            !isTTSPlayingRef.current &&
            !isStartingRef.current
          ) {
            isStartingRef.current = true;
            try { recognition.start(); }
            catch { isStartingRef.current = false; }
          }
        }, 250);
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;

      if (event.error === "aborted") return;

      if (event.error === "no-speech") {
        // Restart on no-speech
        if (isActiveRef.current && !isTTSPlayingRef.current) {
          setTimeout(() => {
            if (isActiveRef.current && !isTTSPlayingRef.current) {
              isStartingRef.current = true;
              try { recognition.start(); }
              catch { isStartingRef.current = false; }
            }
          }, 300);
        }
        return;
      }

      if (event.error === "audio-capture" || event.error === "not-allowed") {
        onErrorRef.current?.(event.error);
        return;
      }

      // Other errors — try restart
      if (isActiveRef.current && !isTTSPlayingRef.current) {
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
      // If TTS playing — interrupt it
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      // Rebuild transcript fresh from all results
      let fullFinal = "";
      let latestInterim = "";

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          fullFinal += transcript;
        } else {
          latestInterim = transcript;
        }
      }

      // Update interim — replace not append
      setInterimText(latestInterim);

      if (fullFinal.trim()) {
        finalTextRef.current = fullFinal.trim();
        clearSilenceTimer();

        // Send after 5 seconds of silence
        silenceTimerRef.current = setTimeout(() => {
          sendTranscript();
        }, silenceThreshold);
      } else if (latestInterim) {
        // User still speaking — reset timer
        clearSilenceTimer();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      try { recognition.abort(); } catch {}
    };
  }, [silenceThreshold, sendTranscript]);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    shouldRestartRef.current = false;
    setIsActive(true);
    // Small delay to ensure component is mounted
    setTimeout(() => tryStart(), 200);
  }, [tryStart]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    tryStop();
    sendTranscript();
    setInterimText("");
  }, [tryStop, sendTranscript]);

  const toggle = useCallback(() => {
    if (isActive) deactivate();
    else activate();
  }, [isActive, activate, deactivate]);

  return {
    isActive,
    isListening,
    interimText,
    isSupported,
    activate,
    deactivate,
    toggle,
    currentTranscript: finalTextRef.current,
  };
}; 

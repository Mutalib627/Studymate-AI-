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
  const finalTranscriptRef = useRef("");
  const isActiveRef = useRef(false);
  const isTTSPlayingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const onSpeechDetectedRef = useRef(onSpeechDetected);
  const shouldRestartRef = useRef(false);
  const isRestartingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onTranscript, onError, onSpeechDetected]);

  useEffect(() => {
    isTTSPlayingRef.current = isTTSPlaying;
    if (!isTTSPlaying && isActiveRef.current && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      setTimeout(() => {
        if (isActiveRef.current && !isTTSPlayingRef.current) {
          startListening();
        }
      }, 500);
    }
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      stopListening();
    }
  }, [isTTSPlaying]);

  const startListening = useCallback(() => {
    if (
      !recognitionRef.current ||
      isTTSPlayingRef.current ||
      isRestartingRef.current
    ) return;

    isRestartingRef.current = true;
    finalTranscriptRef.current = "";
    setInterimText("");

    try {
      recognitionRef.current.start();
    } catch (e: any) {
      // Already started — ignore
    } finally {
      setTimeout(() => {
        isRestartingRef.current = false;
      }, 300);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.abort();
    } catch {}
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

    // Request mic once and keep stream alive
    // This stops the mic from toggling on/off repeatedly
    navigator.mediaDevices
      ?.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      .then((stream) => {
        mediaStreamRef.current = stream;
      })
      .catch(() => {});

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true; // Keep listening continuously
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isRestartingRef.current = false;
    };

    recognition.onend = () => {
      setIsListening(false);
      isRestartingRef.current = false;

      // Auto restart only if still active and not TTS playing
      if (isActiveRef.current && !isTTSPlayingRef.current && !shouldRestartRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isTTSPlayingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        }, 200);
      }
    };

    recognition.onerror = (event: any) => {
      isRestartingRef.current = false;
      if (
        event.error === "aborted" ||
        event.error === "no-speech" ||
        event.error === "network"
      ) {
        // Auto restart on these non-critical errors
        if (isActiveRef.current && !isTTSPlayingRef.current) {
          setTimeout(() => {
            if (isActiveRef.current && !isTTSPlayingRef.current) {
              try { recognition.start(); } catch {}
            }
          }, 300);
        }
        return;
      }
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
        // Reset silence timer while user is still speaking
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }

      if (finalTranscript.trim()) {
        finalTranscriptRef.current += " " + finalTranscript.trim();
        finalTranscriptRef.current = finalTranscriptRef.current.trim();
        setInterimText("");

        // Start 5 second silence timer
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = finalTranscriptRef.current.trim();
          if (textToSend.length >= minTranscriptLength) {
            onTranscriptRef.current(textToSend);
          }
          finalTranscriptRef.current = "";
          setInterimText("");
        }, silenceThreshold);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recognition.abort(); } catch {}
      // Release mic stream
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    shouldRestartRef.current = false;
    setIsActive(true);
    startListening();
  }, [startListening]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    stopListening();
    const remaining = finalTranscriptRef.current.trim();
    if (remaining && remaining.length >= 3) {
      onTranscriptRef.current(remaining);
    }
    finalTranscriptRef.current = "";
    setInterimText("");
    // Release mic
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }, [stopListening]);

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
    currentTranscript: finalTranscriptRef.current,
  };
};

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
  const isStartingRef = useRef(false);

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
          tryStart();
        }
      }, 800);
    }
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      tryStop();
    }
  }, [isTTSPlaying]);

  const tryStart = useCallback(() => {
    if (
      !recognitionRef.current ||
      isTTSPlayingRef.current ||
      isStartingRef.current
    ) return;

    isStartingRef.current = true;
    finalTranscriptRef.current = "";
    setInterimText("");

    try {
      recognitionRef.current.start();
    } catch (e: any) {
      isStartingRef.current = false;
    }
  }, []);

  const tryStop = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    isStartingRef.current = false;
    try {
      recognitionRef.current?.stop();
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

    const recognition = new SpeechRecognitionAPI();
    // IMPORTANT: Do NOT use continuous=true on Android
    // It causes audio-capture errors
    // Instead use continuous=false and restart manually
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isStartingRef.current = false;
      console.log("Recognition started");
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;
      console.log("Recognition ended");

      // Auto restart if still active and TTS not playing
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
            tryStart();
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      console.log("Recognition error:", event.error);

      if (event.error === "aborted") return;

      if (event.error === "no-speech") {
        // Restart on no-speech
        if (isActiveRef.current && !isTTSPlayingRef.current) {
          setTimeout(() => tryStart(), 300);
        }
        return;
      }

      if (event.error === "audio-capture") {
        // Mic not available — notify user
        onErrorRef.current?.("not-allowed");
        return;
      }

      if (event.error === "not-allowed") {
        onErrorRef.current?.("not-allowed");
        return;
      }

      // For other errors retry
      if (isActiveRef.current && !isTTSPlayingRef.current) {
        setTimeout(() => tryStart(), 1000);
      }
    };

    recognition.onresult = (event: any) => {
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }

      if (final.trim()) {
        finalTranscriptRef.current =
          (finalTranscriptRef.current + " " + final.trim()).trim();
        setInterimText("");

        // Start silence timer
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
    };
  }, []);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    shouldRestartRef.current = false;
    setIsActive(true);
    setTimeout(() => tryStart(), 200);
  }, [tryStart]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    tryStop();
    const remaining = finalTranscriptRef.current.trim();
    if (remaining && remaining.length >= 3) {
      onTranscriptRef.current(remaining);
    }
    finalTranscriptRef.current = "";
    setInterimText("");
  }, [tryStop]);

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

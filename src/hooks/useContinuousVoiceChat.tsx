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
  silenceThreshold = 5000, // 5 seconds silence
  minTranscriptLength = 5,
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
  const lastFinalTextRef = useRef("");

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onTranscript, onError, onSpeechDetected]);

  useEffect(() => {
    isTTSPlayingRef.current = isTTSPlaying;
    if (!isTTSPlaying && isActiveRef.current && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      setTimeout(() => startRecognition(), 300);
    }
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      stopRecognition();
    }
  }, [isTTSPlaying]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // Request mic with noise suppression — no sound feedback
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      }).catch(() => {});
    }

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (isActiveRef.current && !isTTSPlayingRef.current) {
        setTimeout(() => {
          if (isActiveRef.current && !isTTSPlayingRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") return;
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      const latestResult = event.results[event.results.length - 1];
      if (!latestResult) return;

      const transcript = latestResult[0].transcript.trim();
      if (!transcript) return;

      if (latestResult.isFinal) {
        const existingText = finalTranscriptRef.current.trim();
        if (!existingText || !isDuplicate(existingText, transcript)) {
          finalTranscriptRef.current = existingText
            ? existingText + " " + transcript
            : transcript;
        }
        setInterimText("");
        lastFinalTextRef.current = transcript;

        // 5 second silence before sending
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = finalTranscriptRef.current.trim();
          if (textToSend && textToSend.length >= minTranscriptLength) {
            onTranscriptRef.current(textToSend);
            finalTranscriptRef.current = "";
            lastFinalTextRef.current = "";
            setInterimText("");
          } else {
            finalTranscriptRef.current = "";
            lastFinalTextRef.current = "";
            setInterimText("");
          }
        }, silenceThreshold);
      } else {
        setInterimText(transcript);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recognition.abort(); } catch {}
    };
  }, [silenceThreshold]);

  const isDuplicate = (existing: string, newText: string): boolean => {
    const existingLower = existing.toLowerCase();
    const newLower = newText.toLowerCase();
    if (existingLower === newLower) return true;
    if (existingLower.includes(newLower)) return true;
    const existingWords = existingLower.split(/\s+/);
    const newWords = newLower.split(/\s+/);
    if (newWords.length <= 1) return false;
    const lastNWords = existingWords.slice(-newWords.length);
    if (lastNWords.length === newWords.length) {
      let matchCount = 0;
      for (let i = 0; i < newWords.length; i++) {
        if (newWords[i] === lastNWords[i]) matchCount++;
      }
      if (matchCount / newWords.length > 0.6) return true;
    }
    return false;
  };

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isTTSPlayingRef.current) return;
    finalTranscriptRef.current = "";
    lastFinalTextRef.current = "";
    setInterimText("");
    try { recognitionRef.current.start(); } catch (e: any) {}
  }, []);

  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const activate = useCallback(() => {
    isActiveRef.current = true;
    shouldRestartRef.current = false;
    setIsActive(true);
    startRecognition();
  }, [startRecognition]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    stopRecognition();
    const remaining = finalTranscriptRef.current.trim();
    if (remaining) {
      onTranscriptRef.current(remaining);
      finalTranscriptRef.current = "";
    }
    setInterimText("");
  }, [stopRecognition]);

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

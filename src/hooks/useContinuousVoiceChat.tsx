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
  const processingRef = useRef(false);
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
      setTimeout(() => tryStart(), 800);
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

  // KEY FIX: Send transcript directly — no extra checks blocking it
  const sendTranscript = useCallback(() => {
    const text = finalTextRef.current.trim();
    console.log('Attempting to send transcript:', text, 'length:', text.length, 'processing:', processingRef.current);

    if (text.length >= minTranscriptLength && !processingRef.current) {
      processingRef.current = true;
      console.log('Sending transcript to AI:', text);
      onTranscriptRef.current(text);
      // Reset after sending
      finalTextRef.current = "";
      setInterimText("");
      // Allow next transcript after 3 seconds
      setTimeout(() => {
        processingRef.current = false;
      }, 3000);
    } else {
      finalTextRef.current = "";
      setInterimText("");
    }
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
      console.log('Recognition started');
    } catch (e: any) {
      isStartingRef.current = false;
      console.log('Start error:', e.message);
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
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isStartingRef.current = false;
      console.log('Voice chat recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      isStartingRef.current = false;
      console.log('Voice chat recognition ended');

      // Auto restart if still active
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
            try {
              recognition.start();
            } catch {
              isStartingRef.current = false;
            }
          }
        }, 300);
      }
    };

    recognition.onerror = (event: any) => {
      isStartingRef.current = false;
      console.log('Voice chat error:', event.error);

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

      // KEY FIX: Only process NEW results from resultIndex
      let newFinalText = "";
      let latestInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          newFinalText += (newFinalText ? " " : "") + transcript;
        } else {
          latestInterim = transcript;
        }
      }

      // Update interim — replace not append
      if (latestInterim) {
        setInterimText(latestInterim);
        clearSilenceTimer();
        console.log('Interim:', latestInterim);
      }

      if (newFinalText) {
        // Append new final text to accumulated
        finalTextRef.current = finalTextRef.current
          ? finalTextRef.current + " " + newFinalText
          : newFinalText;

        setInterimText("");
        console.log('Final accumulated:', finalTextRef.current);

        // KEY FIX: Start silence timer — send after user stops talking
        clearSilenceTimer();
        silenceTimerRef.current = setTimeout(() => {
          console.log('Silence timer fired — sending transcript');
          sendTranscript();
        }, silenceThreshold);
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
    processingRef.current = false;
    setIsActive(true);
    setTimeout(() => tryStart(), 300);
  }, [tryStart]);

  const deactivate = useCallback(() => {
    isActiveRef.current = false;
    shouldRestartRef.current = false;
    setIsActive(false);
    tryStop();
    // Send any remaining transcript
    const remaining = finalTextRef.current.trim();
    if (remaining && remaining.length >= minTranscriptLength && !processingRef.current) {
      onTranscriptRef.current(remaining);
    }
    finalTextRef.current = "";
    setInterimText("");
  }, [tryStop, minTranscriptLength]);

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

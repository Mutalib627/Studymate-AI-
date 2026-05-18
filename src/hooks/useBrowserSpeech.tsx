import { useCallback, useEffect, useRef, useState } from "react";
import { useElevenLabsSpeech } from "@/hooks/useElevenLabsSpeech";

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

  const speak = useCallback(
    (text: string) => {
      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;
      kokoroSpeak(cleaned);
    },
    [kokoroSpeak],
  );

  const toggle = useCallback(
    (text: string) => {
      if (isSpeaking || isLoading) kokoroStop();
      else speak(text);
    },
    [isSpeaking, isLoading, kokoroStop, speak],
  );

  return {
    speak,
    stop: kokoroStop,
    toggle,
    isSpeaking,
    isSupported: true,
    voices: [] as never[],
  };
};

interface UseBrowserRecognitionOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

export const useBrowserRecognition = (options: UseBrowserRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(options.onResult);
  const onErrorRef = useRef(options.onError);
  const hasSentRef = useRef(false);
  const isListeningRef = useRef(false);
  // KEY FIX: track the index of the last processed final result
  const lastProcessedIndexRef = useRef(0);

  useEffect(() => {
    onResultRef.current = options.onResult;
    onErrorRef.current = options.onError;
  }, [options.onResult, options.onError]);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    // continuous=false on Android is more reliable for single utterances
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      hasSentRef.current = false;
      lastProcessedIndexRef.current = 0;
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      isListeningRef.current = false;
      clearSilenceTimer();
      setInterimText("");
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
      // KEY FIX: Only process NEW results using resultIndex
      // This stops words from being repeated
      let newFinalText = "";
      let currentInterim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript.trim();
        if (result.isFinal) {
          newFinalText += (newFinalText ? " " : "") + transcript;
        } else {
          currentInterim = transcript;
        }
      }

      // Update interim display
      if (currentInterim) {
        setInterimText(currentInterim);
        clearSilenceTimer();
      }

      if (newFinalText) {
        setInterimText("");
        clearSilenceTimer();

        if (!hasSentRef.current) {
          hasSentRef.current = true;
          onResultRef.current(newFinalText);
        }

        try { recognition.stop(); } catch {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearSilenceTimer();
      try { recognition.abort(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;
    hasSentRef.current = false;
    lastProcessedIndexRef.current = 0;
    setInterimText("");
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        try { recognitionRef.current.stop(); } catch {}
        setTimeout(() => {
          hasSentRef.current = false;
          try { recognitionRef.current?.start(); } catch {}
        }, 400);
      }
    }
  }, []);

  const stop = useCallback(() => {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return {
    start,
    stop,
    toggle,
    isListening,
    isSupported,
    interimText,
  };
};

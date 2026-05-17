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

// Voice recognition hook using browser SpeechRecognition
interface UseBrowserRecognitionOptions {
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

export const useBrowserRecognition = (options: UseBrowserRecognitionOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef<string>("");
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(options.onResult);
  const onErrorRef = useRef(options.onError);
  const hasSentRef = useRef(false);

  useEffect(() => {
    onResultRef.current = options.onResult;
    onErrorRef.current = options.onError;
  }, [options.onResult, options.onError]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      finalTranscriptRef.current = "";
      hasSentRef.current = false;
      setInterimText("");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!hasSentRef.current && finalTranscriptRef.current.trim()) {
        hasSentRef.current = true;
        onResultRef.current(finalTranscriptRef.current.trim());
      }
      finalTranscriptRef.current = "";
      setInterimText("");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    };

    recognition.onerror = (event: any) => {
      console.log('Recognition error:', event.error);
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setIsListening(false);
        return;
      }
      setIsListening(false);
      setInterimText("");
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalTranscript = transcript;
        } else {
          interimTranscript = transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current = finalTranscript;
        setInterimText("");
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim() && !hasSentRef.current) {
            hasSentRef.current = true;
            const textToSend = finalTranscriptRef.current.trim();
            onResultRef.current(textToSend);
            try { recognition.stop(); } catch {}
          }
        }, 800);
      } else if (interimTranscript) {
        setInterimText(interimTranscript);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      try { recognition.abort(); } catch {}
    };
  }, []);

  const start = useCallback(() => {
    if (!recognitionRef.current) return;
    // DO NOT call getUserMedia here
    // Let SpeechRecognition handle mic access on its own
    finalTranscriptRef.current = "";
    hasSentRef.current = false;
    setInterimText("");
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        try { recognitionRef.current.stop(); } catch {}
        setTimeout(() => {
          try {
            hasSentRef.current = false;
            finalTranscriptRef.current = "";
            recognitionRef.current?.start();
          } catch {}
        }, 300);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
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

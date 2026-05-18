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
  const isListeningRef = useRef(false);
  const sentRef = useRef(false);
  // Store the single clean final result
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
    setIsSupported(!!API);
    if (!API) return;

    const recognition = new API();
    // continuous=false: fires one clean result then stops
    // This avoids the accumulation problem entirely
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

      // Send whatever we have when recognition ends naturally
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
      // With continuous=false, event.results contains ONE utterance
      // The last result is the most complete version
      // We take ONLY the final result when isFinal=true

      let finalTranscript = "";
      let interimTranscript = "";

      // Only look at results from resultIndex onwards — ignore old ones
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript = text; // Replace, not append
        } else {
          interimTranscript = text; // Replace, not append
        }
      }

      if (interimTranscript) {
        setInterimText(interimTranscript);
      }

      if (finalTranscript.trim()) {
        finalResultRef.current = finalTranscript.trim();
        setInterimText("");
        clearTimer();

        // Send after short pause
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

  return { start, stop, toggle, isListening, isSupported, interimText };
}; 

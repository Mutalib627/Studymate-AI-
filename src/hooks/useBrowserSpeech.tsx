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

/**
 * Backwards-compatible wrapper. Uses Kokoro TTS via Edge Function.
 * NO browser SpeechSynthesis is used.
 */
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
  const micStreamRef = useRef<MediaStream | null>(null);

  // Pre-acquire mic stream to suppress the system "pop" beep on Android
  // when SpeechRecognition starts. Stream is released on stop().
  const acquireMicStream = async () => {
    if (micStreamRef.current) return;
    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // ignore — recognition will still attempt without pre-acquisition
    }
  };
  const releaseMicStream = () => {
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
  };

  // Keep refs updated
  useEffect(() => {
    onResultRef.current = options.onResult;
    onErrorRef.current = options.onError;
  }, [options.onResult, options.onError]);

  // Initialize recognition once
  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false; // Changed to false - get one complete result
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[Speech] Recognition started');
      setIsListening(true);
      // Reset all state on start
      finalTranscriptRef.current = "";
      hasSentRef.current = false;
      setInterimText("");
    };

    recognition.onend = () => {
      console.log('[Speech] Recognition ended, hasSent:', hasSentRef.current, 'transcript:', finalTranscriptRef.current);
      setIsListening(false);
      
      // Send accumulated text if we haven't sent yet and have text
      if (!hasSentRef.current && finalTranscriptRef.current.trim()) {
        console.log('[Speech] Sending on end:', finalTranscriptRef.current);
        hasSentRef.current = true;
        onResultRef.current(finalTranscriptRef.current.trim());
      }
      
      // Clean up
      finalTranscriptRef.current = "";
      setInterimText("");
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      releaseMicStream();
    };

    recognition.onerror = (event: any) => {
      console.log('[Speech] Recognition error:', event.error);
      
      // Don't treat these as errors
      if (event.error === 'aborted' || event.error === 'no-speech') {
        setIsListening(false);
        releaseMicStream();
        return;
      }
      
      setIsListening(false);
      setInterimText("");
      releaseMicStream();
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // FIXED: Only process new results, don't re-process old ones
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          // This is final - use only this transcript, don't append
          finalTranscript = transcript;
        } else {
          // This is interim - show it but don't save
          interimTranscript = transcript;
        }
      }

      console.log('[Speech] Result - final:', finalTranscript, 'interim:', interimTranscript);

      if (finalTranscript) {
        // Store the final transcript (replace, don't append to avoid duplication)
        finalTranscriptRef.current = finalTranscript;
        setInterimText("");
        
        // Clear existing timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        // Auto-send after short silence
        silenceTimeoutRef.current = setTimeout(() => {
          if (finalTranscriptRef.current.trim() && !hasSentRef.current) {
            console.log('[Speech] Auto-sending after silence:', finalTranscriptRef.current);
            hasSentRef.current = true;
            const textToSend = finalTranscriptRef.current.trim();
            onResultRef.current(textToSend);
            
            // Stop recognition after sending
            try {
              recognition.stop();
            } catch (e) {
              // Ignore
            }
          }
        }, 800);
      } else if (interimTranscript) {
        // Show interim text (replaces, doesn't append)
        setInterimText(interimTranscript);
        
        // Reset silence timer on interim results
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
      try {
        recognition.abort();
      } catch (e) {
        // Ignore
      }
    };
  }, []);

  const start = useCallback(async () => {
    if (!recognitionRef.current) return;
    
    // Reset all state
    finalTranscriptRef.current = "";
    hasSentRef.current = false;
    setInterimText("");
    
    // Pre-acquire mic to suppress system pop on Android
    await acquireMicStream();
    
    try {
      recognitionRef.current.start();
      console.log('[Speech] Starting recognition...');
    } catch (e: any) {
      if (e.message?.includes('already started')) {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            hasSentRef.current = false;
            finalTranscriptRef.current = "";
            recognitionRef.current?.start();
          } catch (e2) {
            console.log('[Speech] Could not restart:', e2);
          }
        }, 100);
      }
    }
  }, []);

  const stop = useCallback(() => {
    if (!recognitionRef.current) return;
    
    console.log('[Speech] Stopping recognition...');
    try {
      recognitionRef.current.stop();
    } catch (e) {
      // Ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
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

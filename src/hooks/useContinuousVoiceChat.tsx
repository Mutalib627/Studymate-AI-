import { useState, useEffect, useCallback, useRef } from "react";

interface UseContinuousVoiceChatOptions {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onSpeechDetected?: () => void; // Called when user starts speaking (for TTS interrupt)
  silenceThreshold?: number;
  minTranscriptLength?: number;
  isTTSPlaying?: boolean;
}

export const useContinuousVoiceChat = ({
  onTranscript,
  onError,
  onSpeechDetected,
  silenceThreshold = 2500,
  minTranscriptLength = 8,
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
  const processedResultsRef = useRef(0); // Track how many results we've already processed
  const lastFinalTextRef = useRef(""); // Track last final segment to deduplicate

  // Keep refs in sync
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
    onErrorRef.current = onError;
    onSpeechDetectedRef.current = onSpeechDetected;
  }, [onTranscript, onError, onSpeechDetected]);

  useEffect(() => {
    isTTSPlayingRef.current = isTTSPlaying;

    // If TTS just stopped and voice chat is active, restart listening
    if (!isTTSPlaying && isActiveRef.current && shouldRestartRef.current) {
      shouldRestartRef.current = false;
      setTimeout(() => startRecognition(), 300);
    }

    // If TTS starts playing, stop current recognition
    if (isTTSPlaying && isActiveRef.current) {
      shouldRestartRef.current = true;
      stopRecognition();
    }
  }, [isTTSPlaying]);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    // Use non-continuous mode on mobile for better accuracy, restart after each result
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // Request microphone with noise suppression and echo cancellation
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        }
      }).catch(() => {/* silently fail, browser will still use default mic */});
    }

    recognition.onstart = () => {
      setIsListening(true);
      processedResultsRef.current = 0;
    };

    recognition.onend = () => {
      setIsListening(false);

      // If voice chat is still active and TTS is not playing, auto-restart
      if (isActiveRef.current && !isTTSPlayingRef.current) {
        // Check if we have pending text that the silence timer hasn't fired for yet
        // Don't send here - let the silence timer handle it
        setTimeout(() => {
          if (isActiveRef.current && !isTTSPlayingRef.current) {
            try {
              recognition.start();
            } catch { }
          }
        }, 100);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }
      onErrorRef.current?.(event.error);
    };

    recognition.onresult = (event: any) => {
      // If TTS is playing and we detect speech, trigger interrupt
      if (isTTSPlayingRef.current) {
        onSpeechDetectedRef.current?.();
        return;
      }

      // Only process from resultIndex to avoid reprocessing
      const latestResult = event.results[event.results.length - 1];
      if (!latestResult) return;

      const transcript = latestResult[0].transcript.trim();
      if (!transcript) return;

      if (latestResult.isFinal) {
        // Deduplicate: check if this final result is substantially the same as what we already have
        const existingText = finalTranscriptRef.current.trim();
        
        // Only append if this text isn't already contained in our accumulated transcript
        if (!existingText || !isDuplicate(existingText, transcript)) {
          finalTranscriptRef.current = existingText 
            ? existingText + " " + transcript 
            : transcript;
        }
        
        setInterimText("");
        lastFinalTextRef.current = transcript;

        // Reset silence timer - wait for full pause before sending
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          const textToSend = finalTranscriptRef.current.trim();
          // Only send if text is long enough to be real speech (filters background noise)
          if (textToSend && textToSend.length >= minTranscriptLength) {
            onTranscriptRef.current(textToSend);
            finalTranscriptRef.current = "";
            lastFinalTextRef.current = "";
            setInterimText("");
          } else {
            // Too short, likely noise — discard
            finalTranscriptRef.current = "";
            lastFinalTextRef.current = "";
            setInterimText("");
          }
        }, silenceThreshold);
      } else {
        // Show interim text (replace, don't accumulate)
        setInterimText(transcript);

        // Reset silence timer on interim activity too
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      try { recognition.abort(); } catch { }
    };
  }, [silenceThreshold]);

  // Check if newText is a duplicate or subset of existingText
  const isDuplicate = (existing: string, newText: string): boolean => {
    const existingLower = existing.toLowerCase();
    const newLower = newText.toLowerCase();
    
    // Exact match
    if (existingLower === newLower) return true;
    
    // New text is contained within existing
    if (existingLower.includes(newLower)) return true;
    
    // Check if the new text ends the same way as existing (common mobile bug)
    const existingWords = existingLower.split(/\s+/);
    const newWords = newLower.split(/\s+/);
    
    if (newWords.length <= 1) return false;
    
    // If >60% of words in new text are already at the end of existing text, it's a duplicate
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
    processedResultsRef.current = 0;
    setInterimText("");
    try {
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.message?.includes("already started")) {
        // Already running
      }
    }
  }, []);

  const stopRecognition = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try { recognitionRef.current?.stop(); } catch { }
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
    // Send any remaining text
    const remaining = finalTranscriptRef.current.trim();
    if (remaining) {
      onTranscriptRef.current(remaining);
      finalTranscriptRef.current = "";
    }
    setInterimText("");
  }, [stopRecognition]);

  const toggle = useCallback(() => {
    if (isActive) {
      deactivate();
    } else {
      activate();
    }
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

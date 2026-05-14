import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * No-op cleanup hook. Audio cleanup is now handled inside useElevenLabsSpeech (Kokoro)
 * which manages its own HTMLAudioElement lifecycle. Browser SpeechSynthesis is no longer used.
 */
export const useSpeechCleanup = () => {
  const location = useLocation();
  useEffect(() => {
    return () => {
      // Stop any playing <audio> elements created by Kokoro hook on route change
      document.querySelectorAll("audio").forEach((a) => {
        try {
          a.pause();
        } catch (_e) {
          /* noop */
        }
      });
    };
  }, [location.pathname]);
};

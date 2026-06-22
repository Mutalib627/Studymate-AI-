import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBrowserRecognition } from "@/hooks/useBrowserSpeech";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  onAutoSend?: (text: string) => void;
  disabled?: boolean;
  autoSend?: boolean;
}

const VoiceRecorder = ({
  onTranscription,
  onAutoSend,
  disabled,
  autoSend = true,
}: VoiceRecorderProps) => {
  const { toast } = useToast();

  const { toggle, isListening, isSupported, interimText } = useBrowserRecognition({
    onResult: (text) => {
      if (autoSend && onAutoSend) {
        onAutoSend(text);
      } else {
        onTranscription(text);
      }
    },
    onError: (error) => {
      toast({
        title: "Microphone error",
        description:
          error === "not-allowed" || error === "audio-capture"
            ? "Please allow microphone access in your browser settings"
            : error === "transcription-failed"
            ? "Could not transcribe audio. Please try again."
            : `Speech error: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Your browser does not support voice input.",
        variant: "destructive",
      });
      return;
    }
    toggle();
  };

  // Show button even on unsupported browsers so user gets a clear error message
  const isTranscribing = isListening && interimText === "Transcribing...";

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`rounded-xl transition-all ${
          isListening ? "ring-2 ring-destructive/50" : ""
        }`}
        title={
          isListening
            ? isTranscribing
              ? "Transcribing your speech..."
              : "Tap to stop recording"
            : "Tap to speak"
        }
      >
        {isTranscribing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      {/* Status bubble */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[200px] max-w-[280px] bg-card border border-border rounded-xl p-2.5 shadow-lg text-sm text-muted-foreground z-10">
          <div className="flex items-center gap-2">
            {isTranscribing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />
                <span>Transcribing...</span>
              </>
            ) : (
              <>
                <div className="flex gap-0.5 flex-shrink-0">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {interimText && interimText !== "Recording..." ? (
                  <span className="truncate">{interimText}</span>
                ) : (
                  <span className="text-muted-foreground">
                    {interimText === "Recording..." ? "Recording... tap to stop" : "Listening..."}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

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
            : `Speech error: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Please use Chrome or Edge browser for voice input.",
        variant: "destructive",
      });
      return;
    }
    toggle();
  };

  if (!isSupported) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        className={`rounded-xl transition-all ${
          isListening ? "ring-2 ring-destructive/50" : ""
        }`}
        title={
          isListening
            ? "Tap to stop — message sends automatically after pause"
            : "Tap to speak"
        }
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      {/* Interim text bubble */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[200px] max-w-[280px] bg-card border border-border rounded-xl p-2.5 shadow-lg text-sm text-muted-foreground z-10">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {interimText ? (
              <span className="truncate">{interimText}</span>
            ) : (
              <span className="text-muted-foreground">Listening...</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder; 

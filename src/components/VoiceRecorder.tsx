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

const VoiceRecorder = ({ onTranscription, onAutoSend, disabled, autoSend = true }: VoiceRecorderProps) => {
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
        title: "Speech recognition error",
        description: error === 'not-allowed' 
          ? "Please allow microphone access to use voice input"
          : `Error: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (!isSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser. Try Chrome or Edge.",
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
          isListening ? 'animate-pulse ring-2 ring-destructive/50' : ''
        }`}
        title={isListening ? "Stop recording" : "Start voice input (auto-sends when you pause)"}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
      {isListening && interimText && (
        <div className="absolute bottom-full mb-2 left-0 right-0 min-w-[200px] max-w-[300px] bg-card border border-border rounded-lg p-2 shadow-lg text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="truncate">{interimText}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;

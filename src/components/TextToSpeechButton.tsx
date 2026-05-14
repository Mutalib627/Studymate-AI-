import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Loader2, Square, RotateCcw } from "lucide-react";
import { useElevenLabsSpeech } from "@/hooks/useElevenLabsSpeech";
import { useToast } from "@/hooks/use-toast";

interface TextToSpeechButtonProps {
  text: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  className?: string;
  showControls?: boolean;
}

const TextToSpeechButton = ({
  text,
  size = "icon",
  variant = "ghost",
  className = "",
  showControls = false,
}: TextToSpeechButtonProps) => {
  const { toast } = useToast();
  const {
    toggle,
    stop,
    replay,
    toggleMute,
    isMuted,
    isSpeaking,
    isLoading,
  } = useElevenLabsSpeech({
    onError: (error) => {
      toast({
        title: "Speech error",
        description: error,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (!text.trim()) {
      toast({
        title: "No text to read",
        description: "There's no content to convert to speech.",
        variant: "destructive",
      });
      return;
    }
    toggle(text);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isLoading && !isSpeaking}
        className={`rounded-lg transition-all ${isSpeaking ? "text-primary" : ""} ${className}`}
        title={isSpeaking ? "Stop speaking" : "Read aloud (Kokoro AI)"}
      >
        {isLoading && !isSpeaking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSpeaking ? (
          <Square className="h-4 w-4 fill-current" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>

      {showControls && (isSpeaking || isLoading) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleMute}
          className="rounded-lg"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
      )}

      {showControls && !isSpeaking && !isLoading && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={replay}
          className="rounded-lg"
          title="Replay last"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default TextToSpeechButton;

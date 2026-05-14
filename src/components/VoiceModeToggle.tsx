import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { useVoiceMode } from "@/contexts/VoiceModeContext";
import { useToast } from "@/hooks/use-toast";

interface VoiceModeToggleProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

const VoiceModeToggle = ({ className = "", size = "sm", showLabel = true }: VoiceModeToggleProps) => {
  const { voiceModeEnabled, toggleVoiceMode } = useVoiceMode();
  const { toast } = useToast();

  const handleToggle = () => {
    toggleVoiceMode();
    toast({
      title: voiceModeEnabled ? "Voice Mode Off" : "Voice Mode On",
      description: voiceModeEnabled 
        ? "AI responses will not be read aloud" 
        : "AI responses will be read aloud automatically",
    });
  };

  return (
    <Button
      type="button"
      variant={voiceModeEnabled ? "default" : "outline"}
      size={size}
      onClick={handleToggle}
      className={`gap-2 ${className}`}
      title={voiceModeEnabled ? "Voice mode on - Click to disable" : "Voice mode off - Click to enable"}
    >
      {voiceModeEnabled ? (
        <Volume2 className="h-4 w-4" />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
      {showLabel && (
        <span className="hidden sm:inline">
          {voiceModeEnabled ? "Voice On" : "Voice Off"}
        </span>
      )}
    </Button>
  );
};

export default VoiceModeToggle;

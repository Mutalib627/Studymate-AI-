import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, Loader2, Volume2, Square } from "lucide-react";
import { useContinuousVoiceChat } from "@/hooks/useContinuousVoiceChat";
import { useElevenLabsSpeech } from "@/hooks/useElevenLabsSpeech";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VoiceChatModeProps {
  onSendMessage: (text: string) => Promise<string | null>;
  onExit: () => void;
  loading: boolean;
  messages: Message[];
}

const VoiceChatMode = ({ onSendMessage, onExit, loading, messages }: VoiceChatModeProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const processingRef = useRef(false);
  const wasInterruptedRef = useRef(false);

  const { speak, stop: stopSpeaking, isSpeaking, isLoading: ttsLoading } = useElevenLabsSpeech({
    onEnd: () => {
      if (!wasInterruptedRef.current) setStatus("listening");
      wasInterruptedRef.current = false;
    },
    onError: () => setStatus("listening"),
  });

  const ttsActive = isSpeaking || ttsLoading;

  const handleUserStartedSpeaking = useCallback(() => {
    if (ttsActive) {
      wasInterruptedRef.current = true;
      stopSpeaking();
      setStatus("listening");
    }
  }, [ttsActive, stopSpeaking]);

  const { isActive, isListening, interimText, isSupported, activate, deactivate } = useContinuousVoiceChat({
    silenceThreshold: 5000,
    minTranscriptLength: 5,
    isTTSPlaying: ttsActive,
    onSpeechDetected: handleUserStartedSpeaking,
    onTranscript: async (text) => {
      if (processingRef.current) return;
      processingRef.current = true;
      setStatus("processing");
      const response = await onSendMessage(text);
      processingRef.current = false;
      if (response) {
        setStatus("speaking");
        speak(response);
      } else {
        setStatus("listening");
      }
    },
    onError: (error) => {
      if (error === "not-allowed") {
        toast({
          title: "Microphone access needed",
          description: "Please allow microphone access to use voice chat",
          variant: "destructive",
        });
        deactivate();
      }
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => activate(), 500);
    return () => {
      clearTimeout(timer);
      deactivate();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (ttsActive) setStatus("speaking");
    else if (loading || processingRef.current) setStatus("processing");
    else if (isListening) setStatus("listening");
    else if (isActive) setStatus("idle");
  }, [ttsActive, loading, isListening, isActive]);

  const handleExit = () => {
    deactivate();
    stopSpeaking();
    onExit();
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <MicOff className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Voice chat is not supported in your browser. Try Chrome or Edge.
        </p>
        <Button onClick={onExit} variant="outline">Back to Text Chat</Button>
      </div>
    );
  }

  // Last AI and user messages
  const lastMessages = messages.slice(-4);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Status bar */}
      <div className="flex-none flex items-center justify-center py-3 border-b border-border">
        <span className={`text-xs font-medium tracking-wide uppercase ${
          status === "listening" ? "text-emerald-500" :
          status === "processing" ? "text-primary" :
          status === "speaking" ? "text-primary" :
          "text-muted-foreground"
        }`}>
          {status === "listening" ? "Listening..." :
           status === "processing" ? "Thinking..." :
           status === "speaking" ? "Speaking..." :
           "Starting..."}
        </span>
      </div>

      {/* Conversation transcript — clean minimal style */}
      <div className="flex-1 flex flex-col justify-end px-6 py-4 gap-3 overflow-y-auto">
        {lastMessages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            Start speaking — I'm listening.
          </p>
        )}
        {lastMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted text-foreground rounded-tl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Interim text while speaking */}
        {interimText && (
          <div className="flex justify-end">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm bg-primary/20 text-primary rounded-tr-sm italic">
              {interimText}
            </div>
          </div>
        )}
      </div>

      {/* Central orb — fixed size, no expand/contract */}
      <div className="flex-none flex flex-col items-center justify-center py-8 gap-6">
        {/* Orb */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Soft glow ring — only when active */}
          {status !== "idle" && (
            <div className={`absolute inset-0 rounded-full opacity-20 animate-pulse ${
              status === "listening" ? "bg-emerald-500" : "bg-primary"
            }`} style={{ transform: "scale(1.4)" }} />
          )}

          {/* Main orb — fixed size always */}
          <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-colors duration-500 ${
            status === "listening"
              ? "bg-emerald-500/15 border-2 border-emerald-500/50"
              : status === "processing"
              ? "bg-primary/15 border-2 border-primary/40"
              : status === "speaking"
              ? "bg-primary/20 border-2 border-primary/50"
              : "bg-muted border-2 border-border"
          }`}>
            {status === "processing" ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : status === "speaking" ? (
              <Volume2 className="h-10 w-10 text-primary" />
            ) : (
              <Mic className={`h-10 w-10 ${
                status === "listening" ? "text-emerald-500" : "text-muted-foreground"
              }`} />
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center px-8">
          {status === "listening"
            ? "Speak now — I'll wait 5 seconds of silence before responding"
            : status === "speaking"
            ? "Tap the mic or speak to interrupt"
            : status === "processing"
            ? "Generating response..."
            : "Getting ready..."}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex-none flex items-center justify-center gap-6 py-6 border-t border-border">
        {/* Stop speaking button */}
        {ttsActive && (
          <Button
            onClick={() => {
              wasInterruptedRef.current = true;
              stopSpeaking();
              setStatus("listening");
            }}
            size="lg"
            variant="secondary"
            className="rounded-full h-12 px-6 gap-2"
          >
            <Square className="h-4 w-4 fill-current" />
            Stop
          </Button>
        )}

        {/* End call button */}
        <Button
          onClick={handleExit}
          size="lg"
          className="rounded-full h-14 w-14 bg-destructive hover:bg-destructive/90 shadow-lg"
        >
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  );
};

export default VoiceChatMode;

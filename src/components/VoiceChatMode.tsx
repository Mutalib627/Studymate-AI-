import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

const VoiceChatMode = ({
  onSendMessage,
  onExit,
  loading,
  messages,
}: VoiceChatModeProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<
    "idle" | "listening" | "processing" | "speaking"
  >("idle");
  const processingRef = useRef(false);
  const wasInterruptedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isLoading: ttsLoading,
  } = useElevenLabsSpeech({
    onEnd: () => {
      wasInterruptedRef.current = false;
      setStatus("listening");
    },
    onError: () => {
      setStatus("listening");
    },
  });

  const ttsActive = isSpeaking || ttsLoading;

  const handleUserStartedSpeaking = useCallback(() => {
    if (ttsActive) {
      wasInterruptedRef.current = true;
      stopSpeaking();
      setStatus("listening");
    }
  }, [ttsActive, stopSpeaking]);

  const { isActive, isListening, interimText, isSupported, activate, deactivate } =
    useContinuousVoiceChat({
      silenceThreshold: 5000,
      minTranscriptLength: 3,
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
            description: "Please allow microphone access in your browser settings",
            variant: "destructive",
          });
          deactivate();
        }
      },
    });

  // Auto activate on mount
  useEffect(() => {
    const timer = setTimeout(() => activate(), 600);
    return () => {
      clearTimeout(timer);
      deactivate();
      stopSpeaking();
    };
  }, []);

  // Sync status
  useEffect(() => {
    if (ttsActive) setStatus("speaking");
    else if (processingRef.current) setStatus("processing");
    else if (isListening) setStatus("listening");
    else if (isActive) setStatus("idle");
  }, [ttsActive, isListening, isActive]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleExit = () => {
    deactivate();
    stopSpeaking();
    onExit();
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <MicOff className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center text-sm">
          Voice chat is not supported in your browser. Please use Chrome or Edge.
        </p>
        <Button onClick={onExit} variant="outline">
          Back to Text Chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top status bar */}
      <div className="flex-none flex items-center justify-between px-5 py-3 border-b border-border">
        <span className="text-sm font-semibold text-foreground">
          Voice Chat
        </span>
        <span
          className={`text-xs font-medium tracking-wide uppercase transition-colors ${
            status === "listening"
              ? "text-emerald-500"
              : status === "processing" || status === "speaking"
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          {status === "listening"
            ? "● Listening"
            : status === "processing"
            ? "● Thinking..."
            : status === "speaking"
            ? "● Speaking"
            : "Starting..."}
        </span>
      </div>

      {/* Conversation transcript */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3 max-w-lg mx-auto">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Start speaking — I'm listening.
            </p>
          )}
          {messages.slice(-20).map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Interim text bubble */}
          {interimText && (
            <div className="flex justify-end">
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm bg-primary/20 text-primary rounded-tr-sm italic">
                {interimText}...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Central orb — fixed size always, no expand/contract */}
      <div className="flex-none flex flex-col items-center py-6 gap-3 border-t border-border">
        {/* Fixed size orb */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Subtle glow — only color changes, no size change */}
          <div
            className={`absolute inset-0 rounded-full transition-colors duration-500 ${
              status === "listening"
                ? "bg-emerald-500/10"
                : status === "processing" || status === "speaking"
                ? "bg-primary/10"
                : "bg-transparent"
            }`}
            style={{ transform: "scale(1.5)" }}
          />

          {/* Orb — always same size */}
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${
              status === "listening"
                ? "bg-emerald-500/15 border-emerald-500/50"
                : status === "processing"
                ? "bg-primary/15 border-primary/40"
                : status === "speaking"
                ? "bg-primary/20 border-primary/50"
                : "bg-muted border-border"
            }`}
          >
            {status === "processing" ? (
              <Loader2 className="h-9 w-9 text-primary animate-spin" />
            ) : status === "speaking" ? (
              <Volume2 className="h-9 w-9 text-primary" />
            ) : (
              <Mic
                className={`h-9 w-9 ${
                  status === "listening"
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                }`}
              />
            )}
          </div>
        </div>

        {/* Status hint */}
        <p className="text-xs text-muted-foreground text-center px-6">
          {status === "listening"
            ? "Speak now — 5 seconds of silence sends your message"
            : status === "speaking"
            ? "Speak to interrupt"
            : status === "processing"
            ? "Generating response..."
            : "Getting ready..."}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex-none flex items-center justify-center gap-5 py-5 border-t border-border">
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

        {/* End call */}
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

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Phone, Loader2, Volume2, Sparkles, Square } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasInterruptedRef = useRef(false);

  const { speak, stop: stopSpeaking, isSpeaking, isLoading: ttsLoading } = useElevenLabsSpeech({
    onEnd: () => {
      if (!wasInterruptedRef.current) {
        setStatus("listening");
      }
      wasInterruptedRef.current = false;
    },
    onError: (error) => {
      toast({
        title: "Voice error",
        description: error,
        variant: "destructive",
      });
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

  const {
    isActive,
    isListening,
    interimText,
    isSupported: sttSupported,
    activate,
    deactivate,
  } = useContinuousVoiceChat({
    silenceThreshold: 2500,
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
    if (ttsActive) {
      setStatus("speaking");
    } else if (loading || processingRef.current) {
      setStatus("processing");
    } else if (isListening) {
      setStatus("listening");
    } else if (isActive) {
      setStatus("idle");
    }
  }, [ttsActive, loading, isListening, isActive]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const handleExit = () => {
    deactivate();
    stopSpeaking();
    onExit();
  };

  const statusConfig = {
    idle: { label: "Ready", color: "text-muted-foreground", pulse: false },
    listening: { label: "Listening", color: "text-emerald-500", pulse: true },
    processing: { label: "Thinking", color: "text-primary", pulse: true },
    speaking: { label: "Speaking", color: "text-primary", pulse: true },
  };

  const currentStatus = statusConfig[status];

  if (!sttSupported) {
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

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background via-primary/5 to-background">
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 backdrop-blur-sm bg-background/60">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Live Voice Chat</span>
        </div>
        <span className={`text-xs font-medium ${currentStatus.color} transition-colors`}>
          {currentStatus.label}
        </span>
      </div>

      {/* Centered orb area – wraps nicely on desktop */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-8 grid lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-10 items-center py-6">
          {/* Orb */}
          <div className="flex flex-col items-center justify-center gap-5 py-4">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing rings */}
              {currentStatus.pulse && (
                <>
                  <div
                    className={`absolute w-44 h-44 sm:w-56 sm:h-56 rounded-full opacity-20 animate-ping ${
                      status === "listening" ? "bg-emerald-500" : "bg-primary"
                    }`}
                    style={{ animationDuration: "2.5s" }}
                  />
                  <div
                    className={`absolute w-32 h-32 sm:w-44 sm:h-44 rounded-full opacity-30 animate-pulse ${
                      status === "listening" ? "bg-emerald-500" : "bg-primary"
                    }`}
                  />
                </>
              )}

              {/* Core orb */}
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-500 backdrop-blur-xl border ${
                  status === "listening"
                    ? "bg-emerald-500/15 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.4)]"
                    : status === "processing"
                    ? "bg-primary/15 border-primary/40 shadow-[0_0_60px_hsl(var(--primary)/0.45)]"
                    : status === "speaking"
                    ? "bg-primary/20 border-primary/50 shadow-[0_0_70px_hsl(var(--primary)/0.55)]"
                    : "bg-muted/40 border-border"
                }`}
              >
                {status === "processing" ? (
                  <Loader2 className="h-12 w-12 sm:h-14 sm:w-14 text-primary animate-spin" />
                ) : status === "speaking" ? (
                  <Volume2 className="h-12 w-12 sm:h-14 sm:w-14 text-primary animate-pulse" />
                ) : (
                  <Mic
                    className={`h-12 w-12 sm:h-14 sm:w-14 ${
                      status === "listening" ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  />
                )}
              </div>
            </div>

            {/* Interim text */}
            <div className="min-h-[2.5rem] flex items-center justify-center">
              {interimText ? (
                <div className="px-4 py-2 bg-card/70 backdrop-blur border border-border rounded-full text-sm text-foreground max-w-xs text-center shadow-sm animate-in fade-in duration-200">
                  {interimText}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  {status === "listening"
                    ? "Speak naturally — I'll respond when you pause."
                    : status === "speaking"
                    ? "Tap or speak to interrupt."
                    : status === "processing"
                    ? "Generating response…"
                    : "Starting voice session…"}
                </p>
              )}
            </div>
          </div>

          {/* Transcript panel — visible alongside on desktop, stacked on mobile */}
          <div className="hidden lg:flex flex-col h-full max-h-[60vh] rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/60 text-xs font-medium text-muted-foreground">
              Conversation
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Your conversation will appear here.
                  </p>
                )}
                {messages.slice(-12).map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Mobile transcript (compact) */}
      <div className="lg:hidden flex-none border-t border-border/60 bg-card/40 backdrop-blur-sm max-h-[28vh] overflow-hidden">
        <ScrollArea className="h-full">
          <div className="px-4 py-3 space-y-2">
            {messages.slice(-6).map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 text-xs ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* End call + Stop speaking */}
      <div className="flex-none flex items-center justify-center gap-4 py-4 sm:py-5 border-t border-border/60 bg-background/60 backdrop-blur-sm">
        {ttsActive && (
          <Button
            onClick={() => {
              wasInterruptedRef.current = true;
              stopSpeaking();
              setStatus("listening");
            }}
            size="lg"
            variant="secondary"
            className="rounded-full h-14 px-6 gap-2 shadow-md transition-transform hover:scale-105"
          >
            <Square className="h-5 w-5 fill-current" />
            Stop
          </Button>
        )}
        <Button
          onClick={handleExit}
          size="lg"
          className="rounded-full h-14 w-14 bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/30 transition-transform hover:scale-105"
        >
          <Phone className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  );
};

export default VoiceChatMode;

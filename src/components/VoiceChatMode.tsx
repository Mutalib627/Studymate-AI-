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
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [started, setStarted] = useState(false);
  const processingRef = useRef(false);
  const wasInterruptedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { speak, stop: stopSpeaking, isSpeaking, isLoading: ttsLoading } =
    useElevenLabsSpeech({
      onEnd: () => {
        wasInterruptedRef.current = false;
        if (isActiveRef.current) setStatus("listening");
      },
      onError: () => {
        if (isActiveRef.current) setStatus("listening");
      },
    });

  const ttsActive = isSpeaking || ttsLoading;
  const isActiveRef = useRef(false);

  const handleSpeechDetected = useCallback(() => {
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
      onSpeechDetected: handleSpeechDetected,
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
        if (error === "not-allowed" || error === "audio-capture") {
          toast({
            title: "Microphone access needed",
            description: "Please allow microphone access in your browser settings and try again.",
            variant: "destructive",
          });
          setStarted(false);
          isActiveRef.current = false;
          deactivate();
        }
      },
    });

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      deactivate();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    if (ttsActive) setStatus("speaking");
    else if (processingRef.current) setStatus("processing");
    else if (isListening) setStatus("listening");
    else if (isActive) setStatus("idle");
  }, [ttsActive, isListening, isActive, started]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  const handleStart = () => {
    setStarted(true);
    isActiveRef.current = true;
    setStatus("listening");
    activate();
  };

  const handleExit = () => {
    isActiveRef.current = false;
    deactivate();
    stopSpeaking();
    onExit();
  };

  if (!isSupported) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
        <MicOff className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          Voice chat requires Chrome or Edge browser.
        </p>
        <Button onClick={onExit} variant="outline">Back to Text Chat</Button>
      </div>
    );
  }

  // Status colour helpers
  const statusColor =
    status === "listening" ? "text-emerald-500" :
    status === "processing" || status === "speaking" ? "text-primary" :
    "text-muted-foreground";

  const statusLabel =
    !started ? "Tap mic to start" :
    status === "listening" ? "● Listening" :
    status === "processing" ? "● Thinking..." :
    status === "speaking" ? "● Speaking" : "● Ready";

  const orbColor =
    !started
      ? "bg-primary/10 border-primary/40 hover:bg-primary/20"
      : status === "listening"
      ? "bg-emerald-500/15 border-emerald-500/50"
      : status === "processing"
      ? "bg-primary/15 border-primary/40"
      : status === "speaking"
      ? "bg-primary/20 border-primary/50"
      : "bg-muted border-border";

  const hintText =
    !started
      ? "Tap the mic to start — microphone permission required"
      : status === "listening"
      ? "Speak now — 5 seconds of silence sends your message"
      : status === "speaking"
      ? "Speak to interrupt the response"
      : status === "processing"
      ? "Generating response..."
      : "Getting ready...";

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Status bar ───────────────────────────────────────────────────── */}
      <div className="flex-none flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border">
        <span className="text-sm font-bold">Voice Chat</span>
        <span className={`text-xs font-semibold tracking-wide ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* ── Main content: two-column on desktop, stacked on mobile ───────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Transcript panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden lg:border-r lg:border-border">
          <ScrollArea className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="space-y-3 sm:space-y-4 max-w-2xl mx-auto">
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-10 sm:py-16">
                  {started
                    ? "Speak — I'll wait 5 seconds of silence before responding."
                    : "Tap the mic button to start the conversation."}
                </p>
              )}
              {messages.slice(-30).map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[72%] lg:max-w-[68%] px-4 py-3 rounded-2xl text-sm sm:text-[15px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {interimText && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] sm:max-w-[72%] px-4 py-3 rounded-2xl text-sm bg-primary/15 text-primary rounded-tr-sm italic">
                    {interimText}...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </div>

        {/* ── Controls panel: right column on desktop, bottom strip on mobile ── */}
        <div className="flex-none lg:w-72 xl:w-80 flex flex-col items-center justify-center gap-5 sm:gap-6 px-4 sm:px-6 lg:px-8 py-5 sm:py-8 border-t lg:border-t-0 border-border bg-card/30">

          {/* Orb */}
          <div
            className={`
              w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40
              rounded-full flex items-center justify-center border-2
              transition-colors duration-500 cursor-pointer
              ${orbColor}
              ${!started ? "shadow-lg" : ""}
            `}
            onClick={!started ? handleStart : undefined}
          >
            {!started ? (
              <Mic className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 text-primary" />
            ) : status === "processing" ? (
              <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 text-primary animate-spin" />
            ) : status === "speaking" ? (
              <Volume2 className="h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 text-primary" />
            ) : (
              <Mic className={`h-10 w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${status === "listening" ? "text-emerald-500" : "text-muted-foreground"}`} />
            )}
          </div>

          {/* Hint text */}
          <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-[220px] sm:max-w-xs lg:max-w-full">
            {hintText}
          </p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-4">
            {!started ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="rounded-full h-12 sm:h-14 px-8 sm:px-10 gap-2 bg-gradient-primary text-white font-semibold shadow-lg text-sm sm:text-base"
              >
                <Mic className="h-5 w-5" />
                Tap to Start
              </Button>
            ) : (
              <>
                {ttsActive && (
                  <Button
                    onClick={() => {
                      wasInterruptedRef.current = true;
                      stopSpeaking();
                      setStatus("listening");
                    }}
                    size="lg"
                    variant="secondary"
                    className="rounded-full h-12 sm:h-14 px-6 sm:px-8 gap-2 text-sm sm:text-base"
                  >
                    <Square className="h-4 w-4 fill-current" />
                    Stop
                  </Button>
                )}
                <Button
                  onClick={handleExit}
                  size="lg"
                  className="rounded-full h-14 w-14 sm:h-16 sm:w-16 bg-destructive hover:bg-destructive/90 shadow-lg"
                  title="End voice chat"
                >
                  <Phone className="h-6 w-6 sm:h-7 sm:w-7 rotate-[135deg]" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceChatMode;

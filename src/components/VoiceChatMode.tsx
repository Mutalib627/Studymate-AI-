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
            description: "Please allow microphone access in Chrome settings and try again.",
            variant: "destructive",
          });
          setStarted(false);
          isActiveRef.current = false;
          deactivate();
        }
      },
    });

  // DO NOT auto-activate — wait for user tap (Android requirement)
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      deactivate();
      stopSpeaking();
    };
  }, []);

  // Sync status
  useEffect(() => {
    if (!started) return;
    if (ttsActive) setStatus("speaking");
    else if (processingRef.current) setStatus("processing");
    else if (isListening) setStatus("listening");
    else if (isActive) setStatus("idle");
  }, [ttsActive, isListening, isActive, started]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, interimText]);

  // Handle start — must be from direct user tap for Android mic permission
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

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Status bar */}
      <div className="flex-none flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-bold">Voice Chat</span>
        <span className={`text-xs font-semibold tracking-wide ${
          status === "listening" ? "text-emerald-500" :
          status === "processing" || status === "speaking" ? "text-primary" :
          "text-muted-foreground"
        }`}>
          {!started ? "Tap mic to start" :
           status === "listening" ? "● Listening" :
           status === "processing" ? "● Thinking..." :
           status === "speaking" ? "● Speaking" : "● Ready"}
        </span>
      </div>

      {/* Transcript */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-3 max-w-lg mx-auto">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              {started
                ? "Speak — I'll wait 5 seconds of silence before responding."
                : "Tap the mic button below to start."}
            </p>
          )}
          {messages.slice(-20).map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted text-foreground rounded-tl-sm"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {interimText && (
            <div className="flex justify-end">
              <div className="max-w-[82%] px-4 py-3 rounded-2xl text-sm bg-primary/15 text-primary rounded-tr-sm italic">
                {interimText}...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Orb */}
      <div className="flex-none flex flex-col items-center py-6 gap-3 border-t border-border">
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center border-2 transition-colors duration-500 cursor-pointer ${
            !started
              ? "bg-primary/10 border-primary/40 hover:bg-primary/20"
              : status === "listening"
              ? "bg-emerald-500/15 border-emerald-500/50"
              : status === "processing"
              ? "bg-primary/15 border-primary/40"
              : status === "speaking"
              ? "bg-primary/20 border-primary/50"
              : "bg-muted border-border"
          }`}
          onClick={!started ? handleStart : undefined}
        >
          {!started ? (
            <Mic className="h-10 w-10 text-primary" />
          ) : status === "processing" ? (
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
          ) : status === "speaking" ? (
            <Volume2 className="h-10 w-10 text-primary" />
          ) : (
            <Mic className={`h-10 w-10 ${status === "listening" ? "text-emerald-500" : "text-muted-foreground"}`} />
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center px-8">
          {!started
            ? "Tap the mic to start — microphone permission required"
            : status === "listening"
            ? "Speak now — 5 seconds of silence sends your message"
            : status === "speaking"
            ? "Speak to interrupt the response"
            : status === "processing"
            ? "Generating response..."
            : "Getting ready..."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex-none flex items-center justify-center gap-5 py-5 border-t border-border">
        {!started ? (
          <Button
            onClick={handleStart}
            size="lg"
            className="rounded-full h-13 px-8 gap-2 bg-gradient-primary text-white font-semibold shadow-lg"
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
                className="rounded-full h-12 px-6 gap-2"
              >
                <Square className="h-4 w-4 fill-current" />
                Stop
              </Button>
            )}
            <Button
              onClick={handleExit}
              size="lg"
              className="rounded-full h-14 w-14 bg-destructive hover:bg-destructive/90 shadow-lg"
            >
              <Phone className="h-6 w-6 rotate-[135deg]" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceChatMode; 

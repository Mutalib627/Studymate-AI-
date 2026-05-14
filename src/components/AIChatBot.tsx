import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Loader2, Copy, Check } from "lucide-react";
import { ChatMessageRenderer } from "@/components/ChatMessageRenderer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";
      setUserName(name);
      setMessages([
        {
          role: "assistant",
          content: `Hello ${name}, I'm Studymate AI. How can I help you today?`,
        },
      ]);
    };

    void initChat();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*/g, '')
      .replace(/\* /g, '• ')
      .replace(/\*/g, '')
      .trim();
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({
      title: "Copied! ✓",
      description: "Response copied to clipboard",
    });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { 
          messages: [...messages, userMessage],
          userName,
          conversationHistory: messages,
        },
      });

      if (error) throw error;

      // Format the response with emojis and bullets
      let formattedResponse = data.response;
      
      // Add friendly emojis if not already present
      // No emoji injection

      const assistantMessage: Message = {
        role: "assistant",
        content: formatMessage(formattedResponse),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description: error.message || "Failed to get response from AI",
        variant: "destructive",
      });
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-br from-primary via-primary-glow to-accent hover:scale-110 transition-all duration-300 z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-96 h-[600px] flex flex-col border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl z-50 animate-in slide-in-from-bottom-8 duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-primary/10 via-primary-glow/10 to-accent/10 border-b border-border/50">
            <CardTitle className="text-base font-semibold text-foreground">
              Studymate AI
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-md transition-all duration-300 hover:shadow-lg ${
                        message.role === "user"
                          ? "bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground"
                          : "bg-muted/80 backdrop-blur-sm text-foreground border border-border/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {message.role === "assistant" ? (
                          <ChatMessageRenderer content={message.content} />
                        ) : (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed flex-1">
                            {message.content}
                          </p>
                        )}
                        {message.role === "assistant" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={() => copyToClipboard(message.content, index)}
                          >
                            {copiedIndex === index ? (
                              <Check className="h-3 w-3 text-accent" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border/50">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="p-4 border-t border-border/50 bg-background/50">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={loading}
                  className="flex-1 rounded-xl border-border/50 bg-background/50 backdrop-blur-sm focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  size="icon"
                  className="rounded-xl bg-gradient-to-br from-primary via-primary-glow to-accent hover:opacity-90 transition-all duration-300"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

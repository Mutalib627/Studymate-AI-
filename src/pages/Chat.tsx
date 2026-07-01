import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Trash2, MessageSquareText, Copy, Check, Menu, Trash, Plus, Mic, MessageCircle, Sparkles, BookOpen, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import VoiceRecorder from "@/components/VoiceRecorder";
import TextToSpeechButton from "@/components/TextToSpeechButton";
import VoiceModeToggle from "@/components/VoiceModeToggle";
import VoiceChatMode from "@/components/VoiceChatMode";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { useVoiceMode } from "@/contexts/VoiceModeContext";
import { ChatMessageRenderer } from "@/components/ChatMessageRenderer";
import { useSpeechCleanup } from "@/hooks/useSpeechCleanup";
import logo from "@/assets/logo.png";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const Chat = () => {
  const location = useLocation();
  const uploadedContent = location.state?.uploadedContent || localStorage.getItem('uploadedContent') || "";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingVoiceMessage, setPendingVoiceMessage] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<"text" | "voice">("text");
  const [userName, setUserName] = useState<string>("there");
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { speak, stop: stopSpeaking, isSpeaking } = useBrowserSpeech();
  const { voiceModeEnabled } = useVoiceMode();
  useSpeechCleanup();

  // Voice chat send handler - returns AI response text for TTS
  const handleVoiceSend = async (text: string): Promise<string | null> => {
    if (!text.trim() || loading) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";

    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('is_paid, subscription_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPaid = subscription?.is_paid &&
      (!subscription.subscription_end || new Date(subscription.subscription_end) > new Date());

    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (conversationId) {
        setCurrentConversationId(conversationId);
        if (!isPaid) {
          await supabase.from('usage_tracking').insert({ user_id: user.id, feature: 'chat' });
        }
      }
    }

    const userMessage = text.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);

    if (conversationId) {
      await saveMessage(conversationId, "user", userMessage);
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: newMessages,
          studyMaterial: uploadedContent,
          userName,
          conversationHistory: messages,
        },
      });

      if (error) throw error;

      const formattedResponse = formatMessage(data.response);
      setMessages(prev => [...prev, { role: "assistant", content: formattedResponse }]);

      if (conversationId) {
        await saveMessage(conversationId, "assistant", data.response);
      }

      return formattedResponse;
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load conversations + cache user's display name on mount
  useEffect(() => {
    loadConversations();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";
      setUserName(name);
    })();
  }, []);

  // Load messages when conversation changes or on mount
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (currentConversationId) {
        loadMessages(currentConversationId);
      } else {
        // Load persisted messages from localStorage or set initial message with user's name
        const savedMessages = localStorage.getItem('currentChatMessages');
        if (savedMessages) {
          setMessages(JSON.parse(savedMessages));
        } else {
          // Get user name for greeting
          const { data: { user } } = await supabase.auth.getUser();
          const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";
          
          setMessages([{
            role: "assistant",
            content: `Hello ${userName}, I'm Studymate AI. How can I help you today?`
          }]);
        }
      }
    };
    
    loadInitialMessages();
  }, [currentConversationId]);

  // Persist current messages to localStorage when not in a saved conversation
  useEffect(() => {
    if (messages.length > 0 && !currentConversationId) {
      localStorage.setItem('currentChatMessages', JSON.stringify(messages));
    }
  }, [messages, currentConversationId]);

  // Persist active conversation id for restoring after navigation
  useEffect(() => {
    if (currentConversationId) {
      localStorage.setItem('activeConversationId', currentConversationId);
    }
  }, [currentConversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Handle voice auto-send
  useEffect(() => {
    if (pendingVoiceMessage && !loading) {
      setInput(pendingVoiceMessage);
      setPendingVoiceMessage(null);
      // Trigger send on next tick after input is set
      setTimeout(() => {
        handleSendWithMessage(pendingVoiceMessage);
      }, 50);
    }
  }, [pendingVoiceMessage, loading]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data);
      const storedId = localStorage.getItem('activeConversationId');
      if (storedId && data.some((c) => c.id === storedId)) {
        setCurrentConversationId(storedId);
      }
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content
      })));
    }
  };

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation'
      })
      .select()
      .single();

    if (!error && data) {
      setConversations(prev => [data, ...prev]);
      return data.id;
    }
    return null;
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content
      });

    // Update conversation timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const formatMessage = (content: string) => {
    // Check if content is structured JSON (table/image) - don't strip formatting
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || trimmed.includes('```json')) {
      return content.trim();
    }
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
      description: "Message copied to clipboard",
    });
  };

  const handleSendWithMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;

    const userMessage = messageText.trim();
    setInput("");
    setLoading(true);

    // Get user info for greeting and usage check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to chat.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";

    // Check subscription and chat limits
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('is_paid, subscription_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPaid = subscription?.is_paid && 
      (!subscription.subscription_end || new Date(subscription.subscription_end) > new Date());

    if (!isPaid) {
      // Check if user has already had a chat session
      const { count } = await supabase
        .from('usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('feature', 'chat');

      if ((count || 0) >= 1) {
        toast({
          title: "Chat limit reached",
          description: "Free users can only have 1 chat session. Upgrade to premium for unlimited access!",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    // Create new conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (conversationId) {
        setCurrentConversationId(conversationId);
        
        // Track chat usage for free users
        if (!isPaid) {
          await supabase.from('usage_tracking').insert({
            user_id: user.id,
            feature: 'chat',
          });
        }
      }
    }

    // Add user message
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);

    // Save user message and generate AI title if it's the first message
    if (conversationId) {
      await saveMessage(conversationId, "user", userMessage);
      
      // Generate smart title using AI for first message
      const currentConv = conversations.find(c => c.id === conversationId);
      if (currentConv && currentConv.title === 'New Conversation') {
        // Generate a short, smart title
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-chat', {
            body: { 
              messages: [{ role: "user", content: `Generate a very short title (max 5 words, no quotes) for a chat that starts with: "${userMessage.substring(0, 100)}"` }],
              studyMaterial: "",
              userName: userName,
              conversationHistory: []
            }
          });
          const generatedTitle = titleData?.response?.trim()?.substring(0, 40) || userMessage.substring(0, 30);
          await supabase
            .from('chat_conversations')
            .update({ title: generatedTitle })
            .eq('id', conversationId);
          setConversations(prev => prev.map(c => 
            c.id === conversationId ? { ...c, title: generatedTitle } : c
          ));
        } catch {
          // Fallback to truncated message
          const title = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
          await supabase
            .from('chat_conversations')
            .update({ title })
            .eq('id', conversationId);
          setConversations(prev => prev.map(c => 
            c.id === conversationId ? { ...c, title } : c
          ));
        }
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          messages: newMessages,
          studyMaterial: uploadedContent,
          userName: userName,
          conversationHistory: messages
        }
      });

      if (error) {
        const isRateLimited = error.message?.includes('Rate limit') || error.message?.includes('429');
        const isOutOfCredits = error.message?.includes('credits') || error.message?.includes('402');
        
        toast({
          title: isRateLimited ? "Rate Limit Exceeded" : isOutOfCredits ? "Out of Credits" : "Error",
          description: isRateLimited 
            ? "Too many requests. Please wait a moment and try again."
            : isOutOfCredits
            ? "AI credits depleted. Please add credits to continue."
            : "Failed to get response. Please try again.",
          variant: "destructive",
        });
        
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      const aiResponse = data.response;
      const formattedResponse = formatMessage(aiResponse);
      const updatedMessages = [...newMessages, { role: "assistant" as const, content: formattedResponse }];
      setMessages(updatedMessages);

      // Save AI response
      if (conversationId) {
        await saveMessage(conversationId, "assistant", aiResponse);
      }

      // Auto-speak AI response if voice mode is enabled
      if (voiceModeEnabled && formattedResponse) {
        setTimeout(() => {
          speak(formattedResponse);
        }, 300);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    await handleSendWithMessage(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationToDelete);

    if (!error) {
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      if (currentConversationId === conversationToDelete) {
        setCurrentConversationId(null);
        setMessages([]);
        localStorage.removeItem('currentChatMessages');
        localStorage.removeItem('activeConversationId');
      }
      toast({
        title: "Conversation Deleted",
        description: "The conversation has been removed.",
      });
    }
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  const startNewChat = async () => {
    setCurrentConversationId(null);
    localStorage.removeItem('currentChatMessages');
    localStorage.removeItem('activeConversationId');
    
    // Get user name for greeting
    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";
    
    setMessages([{
      role: "assistant",
      content: `Hello ${userName}, I'm Studymate AI. How can I help you today?`
    }]);
  };

  const handleClearAllConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setConversations([]);
      setCurrentConversationId(null);
      setMessages([]);
      localStorage.removeItem('currentChatMessages');
      localStorage.removeItem('activeConversationId');
      
      // Get user name for greeting
      const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "there";
      
      setMessages([{
        role: "assistant",
        content: `Hello ${userName}, I'm Studymate AI. How can I help you today?`
      }]);
      
      toast({
        title: "All Conversations Deleted",
        description: "Your chat history has been cleared.",
      });
    }
  };

  const isWelcomeState =
    !currentConversationId &&
    messages.length <= 1 &&
    chatMode === "text";

  const quickPrompts = [
    { icon: BookOpen, label: "Summarize a topic", text: "Summarize this topic for me: " },
    { icon: Sparkles, label: "Quiz me", text: "Quiz me on what I've uploaded." },
    { icon: Lightbulb, label: "Explain a concept", text: "Explain this concept simply: " },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop sidebar (persistent, lg and up) ─────────────── */}
      <aside className="hidden lg:flex lg:w-[280px] xl:w-[304px] flex-shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
        <div className="p-4 border-b border-border">
          <button
            onClick={() => {
              stopSpeaking();
              navigate("/");
            }}
            className="flex items-center gap-2.5 mb-4 group"
          >
            <div className="relative flex-shrink-0">
              <img src={logo} alt="Studymate AI" className="h-9 w-9 rounded-xl object-contain bg-white border border-border shadow-sm group-hover:shadow-md transition-shadow" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-bold leading-tight truncate">Studymate AI</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">Online</p>
            </div>
          </button>
          <Button
            onClick={startNewChat}
            className="w-full justify-center gap-2 rounded-xl h-10 shadow-card bg-gradient-primary text-white hover:shadow-glow transition-all"
          >
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 gap-3 text-muted-foreground">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MessageSquareText className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">No chats yet</p>
              <p className="text-xs">Start a new conversation to see it here.</p>
            </div>
          ) : (
            <div className="p-2.5 space-y-1">
              <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Recent
              </p>
              {conversations.map((conv) => {
                const active = currentConversationId === conv.id;
                return (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${
                      active
                        ? "bg-primary/10 border border-primary/30 shadow-sm"
                        : "hover:bg-muted/60 border border-transparent"
                    }`}
                    onClick={() => setCurrentConversationId(conv.id)}
                  >
                    <MessageSquareText className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${active ? "text-primary font-medium" : "text-foreground"}`}>
                        {conv.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 flex-shrink-0 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConversationToDelete(conv.id);
                        setDeleteDialogOpen(true);
                      }}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {conversations.length > 0 && (
          <div className="p-3 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleClearAllConversations}
              className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl h-9"
            >
              <Trash className="h-4 w-4" />
              Clear all
            </Button>
          </div>
        )}
      </aside>

      {/* ── Main column ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sticky glass header */}
        <header className="flex-none sticky top-0 z-20 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm px-2 sm:px-4 py-2.5 flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopSpeaking();
              navigate("/");
            }}
            className="rounded-xl hover:bg-muted h-9 w-9 flex-shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>

          {/* History drawer trigger — mobile & tablet only, desktop uses the persistent sidebar */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl hover:bg-muted h-9 w-9 flex-shrink-0 lg:hidden"
                aria-label="Chat history"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-[340px] p-0 flex flex-col">
              <SheetHeader className="p-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                <SheetTitle className="text-left text-base">Chat History</SheetTitle>
                <Button
                  onClick={() => {
                    startNewChat();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2 w-full justify-center gap-2 rounded-xl shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </SheetHeader>
              <ScrollArea className="flex-1">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-8 gap-3 text-muted-foreground">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <MessageSquareText className="h-7 w-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No chats yet</p>
                    <p className="text-xs">Start a new conversation to see it here.</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {conversations.map((conv) => {
                      const active = currentConversationId === conv.id;
                      return (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                            active
                              ? "bg-primary/10 border border-primary/30"
                              : "hover:bg-muted/60 border border-transparent"
                          }`}
                          onClick={() => {
                            setCurrentConversationId(conv.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <MessageSquareText className={`h-4 w-4 flex-shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm truncate ${active ? "text-primary font-medium" : "text-foreground"}`}>
                              {conv.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {new Date(conv.updated_at).toLocaleDateString()} · {new Date(conv.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 hover:bg-destructive/10 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConversationToDelete(conv.id);
                              setDeleteDialogOpen(true);
                              setMobileMenuOpen(false);
                            }}
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              {conversations.length > 0 && (
                <div className="p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleClearAllConversations();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-center gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl"
                  >
                    <Trash className="h-4 w-4" />
                    Clear all
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Brand — hidden on desktop since the sidebar already shows it */}
          <div className="flex-1 flex items-center gap-2 min-w-0 lg:hidden">
            <div className="relative flex-shrink-0">
              <img src={logo} alt="Studymate AI" className="h-8 w-8 rounded-lg object-contain bg-white border border-border" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold leading-tight truncate">Studymate AI</h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 leading-tight">Online</p>
            </div>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:flex flex-1 min-w-0 items-center">
            <h1 className="text-sm font-semibold text-muted-foreground truncate">
              {currentConversationId
                ? conversations.find((c) => c.id === currentConversationId)?.title || "Chat"
                : "New conversation"}
            </h1>
          </div>

          {/* Mode toggle (text/voice) */}
          <div className="flex items-center bg-muted rounded-xl p-0.5 flex-shrink-0">
            <Button
              variant={chatMode === "text" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setChatMode("text")}
              aria-label="Text chat"
              aria-pressed={chatMode === "text"}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={chatMode === "voice" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setChatMode("voice")}
              aria-label="Voice chat"
              aria-pressed={chatMode === "voice"}
            >
              <Mic className="h-3.5 w-3.5" />
            </Button>
          </div>
          <VoiceModeToggle size="icon" showLabel={false} />
          <Button
            variant="ghost"
            size="icon"
            onClick={startNewChat}
            className="rounded-xl hover:bg-muted h-9 w-9 flex-shrink-0 lg:hidden"
            aria-label="New chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {chatMode === "voice" ? (
            <VoiceChatMode
              onSendMessage={handleVoiceSend}
              onExit={() => setChatMode("text")}
              loading={loading}
              messages={messages}
            />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-background">
              {/* Subtle ambient background */}
              <div
                className="pointer-events-none fixed inset-0 opacity-[0.4] -z-10"
                style={{ backgroundImage: "var(--gradient-mesh)" }}
                aria-hidden
              />

              {/* Messages or Welcome */}
              <ScrollArea className="flex-1 overflow-y-auto" style={{ scrollBehavior: "smooth" }}>
                <div className="max-w-3xl lg:max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5">
                  {isWelcomeState ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 sm:py-16 lg:py-20 gap-5 animate-in fade-in duration-500">
                      <div className="relative">
                        <span className="absolute -inset-4 rounded-full bg-gradient-primary opacity-20 blur-2xl animate-pulse-glow -z-10" />
                        <img
                          src={logo}
                          alt="Studymate AI"
                          className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-contain bg-white border border-border shadow-lg-glow"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                          Hello {userName}! <span aria-hidden>👋</span>
                        </h2>
                        <p className="text-sm sm:text-base text-muted-foreground max-w-xs sm:max-w-md mx-auto">
                          Ask me anything, or upload your study materials to get started.
                        </p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2 pt-2 max-w-lg">
                        {quickPrompts.map((qp) => (
                          <button
                            key={qp.label}
                            onClick={() => setInput(qp.text)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-card hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all text-xs sm:text-sm text-foreground shadow-sm hover:shadow-card"
                          >
                            <qp.icon className="h-3.5 w-3.5 text-primary" />
                            {qp.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" && (
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-primary/10">
                            <img src={logo} alt="AI" className="h-7 w-7 object-contain" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] sm:max-w-[78%] lg:max-w-[70%] px-3.5 sm:px-4 py-2.5 sm:py-3 shadow-sm ${
                            message.role === "user"
                              ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-[18px] rounded-tr-sm"
                              : "bg-card border border-border text-foreground rounded-[18px] rounded-tl-sm"
                          }`}
                        >
                          <div className="flex flex-col gap-1.5">
                            {message.role === "assistant" ? (
                              <ChatMessageRenderer content={message.content} />
                            ) : (
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                {message.content}
                              </p>
                            )}
                            {message.role === "assistant" && (
                              <div className="flex items-center gap-0.5 -mb-1">
                                <TextToSpeechButton
                                  text={message.content}
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-muted"
                                  onClick={() => copyToClipboard(message.content, index)}
                                  aria-label="Copy"
                                >
                                  {copiedIndex === index ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {loading && (
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm ring-1 ring-primary/10">
                        <img src={logo} alt="AI" className="h-7 w-7 object-contain" />
                      </div>
                      <div className="bg-card border border-border rounded-[18px] rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Pill Input Bar */}
              <div className="flex-none bg-gradient-to-t from-background via-background to-background/80 px-2.5 sm:px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                <div className="max-w-3xl lg:max-w-4xl mx-auto">
                  <div className="flex items-end gap-2 bg-card border border-border focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)] rounded-3xl shadow-[0_-2px_12px_-4px_rgba(0,0,0,0.06)] px-2 py-1.5 transition-all">
                    <div className="pb-0.5">
                      <VoiceRecorder
                        onTranscription={(text) => setInput((prev) => (prev ? `${prev} ${text}` : text))}
                        onAutoSend={(text) => setPendingVoiceMessage(text)}
                        disabled={loading}
                        autoSend={true}
                      />
                    </div>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Message or tap mic to speak..."
                      disabled={loading}
                      rows={1}
                      className="flex-1 bg-transparent text-[15px] leading-relaxed py-2.5 px-1 resize-none overflow-hidden min-h-[40px] max-h-[140px] focus:outline-none placeholder:text-muted-foreground"
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = "auto";
                        target.style.height = Math.min(target.scrollHeight, 140) + "px";
                      }}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={loading || !input.trim()}
                      size="icon"
                      className="rounded-full h-10 w-10 bg-gradient-to-br from-primary to-primary/85 hover:opacity-90 disabled:opacity-40 disabled:from-muted disabled:to-muted disabled:text-muted-foreground flex-shrink-0 shadow-md transition-all active:scale-95"
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Chat;

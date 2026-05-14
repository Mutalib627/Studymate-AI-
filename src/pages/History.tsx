import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Search, Trash2, BookOpen, BrainCircuit, Calendar, Image, Download, MessageCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import jsPDF from "jspdf";

interface StudySession {
  id: string;
  session_type: string;
  content_preview: string;
  full_content: string;
  result: any;
  image_count: number;
  created_at: string;
}

const History = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<StudySession[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndLoadSessions();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [searchQuery, sessions]);

  const checkAuthAndLoadSessions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    loadSessions();
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter(
      (session) => {
        const contentMatch = session.content_preview.toLowerCase().includes(query) ||
          session.full_content.toLowerCase().includes(query) ||
          session.session_type.toLowerCase().includes(query);
        
        const chatMatch = session.result?.conversation?.some((msg: any) => 
          msg.content.toLowerCase().includes(query)
        );

        return contentMatch || chatMatch;
      }
    );
    setFilteredSessions(filtered);
  };

  const downloadPDF = (session: StudySession) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPos = margin;

    doc.setFontSize(20);
    doc.setTextColor(25, 155, 203);
    doc.text("Studymate AI", margin, yPos);
    yPos += 15;

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(format(new Date(session.created_at), "PPpp"), margin, yPos);
    yPos += 15;

    // Handle chat sessions
    if (session.session_type === 'chat' && session.result?.conversation) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Chat Conversation", margin, yPos);
      yPos += 12;

      session.result.conversation.forEach((msg: any, idx: number) => {
        if (yPos > pageHeight - margin - 30) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(11);
        doc.setTextColor(msg.role === 'user' ? 25 : 100, msg.role === 'user' ? 155 : 100, msg.role === 'user' ? 203 : 100);
        doc.text(msg.role === 'user' ? 'You:' : 'AI:', margin, yPos);
        yPos += 6;

        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const msgLines = doc.splitTextToSize(msg.content, maxWidth - 5);
        msgLines.forEach((line: string) => {
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 8;
      });
    } else if (session.session_type === 'summary' && session.result?.summary) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Summary", margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const summaryLines = doc.splitTextToSize(session.result.summary, maxWidth);
      summaryLines.forEach((line: string) => {
        if (yPos > pageHeight - margin) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos);
        yPos += 6;
      });

      yPos += 10;

      if (session.result.keyTerms?.length > 0) {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text("Key Terms", margin, yPos);
        yPos += 10;

        session.result.keyTerms.forEach((kt: any) => {
          if (yPos > pageHeight - margin - 20) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(12);
          doc.setTextColor(25, 155, 203);
          doc.text(`• ${kt.term}`, margin, yPos);
          yPos += 7;

          doc.setFontSize(10);
          doc.setTextColor(60, 60, 60);
          const defLines = doc.splitTextToSize(kt.definition, maxWidth - 5);
          defLines.forEach((line: string) => {
            if (yPos > pageHeight - margin) {
              doc.addPage();
              yPos = margin;
            }
            doc.text(line, margin + 5, yPos);
            yPos += 6;
          });
          yPos += 5;
        });
      }
    } else if (session.session_type === 'quiz' && session.result) {
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("Quiz Results", margin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(25, 155, 203);
      doc.text(`Score: ${session.result.score || 0}%`, margin, yPos);
      yPos += 7;
      doc.text(`Correct: ${session.result.correctAnswers || 0}/${session.result.totalQuestions || 0}`, margin, yPos);
      yPos += 15;

      if (session.result.questions) {
        session.result.questions.forEach((q: any, idx: number) => {
          if (yPos > pageHeight - margin - 30) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const qLines = doc.splitTextToSize(`Q${idx + 1}: ${q.question}`, maxWidth);
          qLines.forEach((line: string) => {
            doc.text(line, margin, yPos);
            yPos += 6;
          });
          yPos += 5;

          const userAnswerIdx = session.result.userAnswers?.[idx];
          const correctAnswerIdx = q.correctAnswer;

          doc.setFontSize(10);
          q.options.forEach((opt: string, optIdx: number) => {
            if (yPos > pageHeight - margin - 20) {
              doc.addPage();
              yPos = margin;
            }
            const isCorrect = optIdx === correctAnswerIdx;
            const wasSelected = userAnswerIdx === optIdx;
            
            if (isCorrect) {
              doc.setTextColor(34, 197, 94);
            } else if (wasSelected) {
              doc.setTextColor(239, 68, 68);
            } else {
              doc.setTextColor(100, 100, 100);
            }
            
            doc.text(`  ${String.fromCharCode(65 + optIdx)}. ${opt}${isCorrect ? ' ✓ CORRECT' : wasSelected ? ' ✗ WRONG' : ''}`, margin, yPos);
            yPos += 6;
            
            if (q.explanations && q.explanations[optIdx]) {
              doc.setFontSize(9);
              doc.setTextColor(80, 80, 80);
              const explText = `    Explanation: ${q.explanations[optIdx]}`;
              const explLines = doc.splitTextToSize(explText, maxWidth - 10);
              explLines.forEach((line: string) => {
                if (yPos > pageHeight - margin) {
                  doc.addPage();
                  yPos = margin;
                }
                doc.text(line, margin, yPos);
                yPos += 5;
              });
              doc.setFontSize(10);
              yPos += 2;
            }
          });
          yPos += 8;
        });
      }
    }

    doc.save(`studymate-${session.session_type}-${format(new Date(session.created_at), "yyyy-MM-dd")}.pdf`);
  };

  const deleteSession = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from("study_sessions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setSessions(sessions.filter((s) => s.id !== id));
      if (selectedSession?.id === id) {
        setSelectedSession(null);
      }
      toast({
        title: "Deleted",
        description: "Session removed from history",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "summary":
        return <BookOpen className="w-4 h-4" />;
      case "chat":
        return <MessageCircle className="w-4 h-4" />;
      default:
        return <BrainCircuit className="w-4 h-4" />;
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case "summary":
        return "bg-primary/10 text-primary";
      case "chat":
        return "bg-accent/10 text-accent";
      default:
        return "bg-accent/10 text-accent";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="flex h-screen">
        {/* Sidebar - Session List */}
        <div className={`${selectedSession ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 xl:w-96 border-r border-border bg-card/50 backdrop-blur-xl flex-col`}>
          {/* Header */}
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="rounded-xl h-9 w-9 hover:scale-105 transition-transform"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    History
                  </h1>
                  <p className="text-xs text-muted-foreground">{sessions.length} sessions</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl border-border/50 bg-background/50"
              />
            </div>
          </div>

          {/* Session List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {searchQuery ? "No sessions match your search" : "No sessions yet"}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredSessions.map((session, index) => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 animate-fade-in hover:bg-muted/50 ${
                      selectedSession?.id === session.id ? "bg-muted" : ""
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getSessionColor(session.session_type)}`}>
                        {getSessionIcon(session.session_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {session.session_type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate mt-1">
                          {session.content_preview.substring(0, 40)}...
                        </p>
                        {session.image_count > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                            <Image className="h-3 w-3" />
                            {session.image_count} image{session.image_count > 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => deleteSession(session.id, e)}
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Detail Panel - Hidden on mobile when no selection */}
        <div className={`flex-1 bg-background hidden md:flex flex-col ${selectedSession ? "" : "items-center justify-center"}`}>
          {selectedSession ? (
            <div className="flex-1 overflow-auto">
              <div className="p-6 max-w-4xl mx-auto animate-fade-in">
                {/* Session Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${getSessionColor(selectedSession.session_type)}`}>
                      {getSessionIcon(selectedSession.session_type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold capitalize">{selectedSession.session_type}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedSession.created_at), "PPpp")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPDF(selectedSession)}
                      className="gap-2 hover:scale-105 transition-transform"
                    >
                      <Download className="h-4 w-4" />
                      PDF
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSession(selectedSession.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Session Content */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-xl" style={{ boxShadow: 'var(--shadow-soft)' }}>
                  <CardContent className="p-6">
                    {selectedSession.session_type === 'chat' ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-accent mb-4">
                          <MessageCircle className="h-5 w-5" />
                          <span className="font-semibold">Conversation</span>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                          {selectedSession.result?.conversation?.map((msg: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl animate-fade-in ${
                                msg.role === 'user'
                                  ? 'bg-gradient-to-br from-primary/20 via-primary-glow/20 to-accent/20 ml-8'
                                  : 'bg-muted/50 mr-8'
                              }`}
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <p className="text-xs font-semibold mb-1 text-muted-foreground">
                                {msg.role === 'user' ? 'You' : 'AI Assistant'}
                              </p>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : selectedSession.session_type === "summary" ? (
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-primary flex items-center gap-2 mb-3">
                            <BookOpen className="h-4 w-4" />
                            Summary
                          </h3>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {typeof selectedSession.result === 'object' && selectedSession.result.summary 
                              ? selectedSession.result.summary 
                              : typeof selectedSession.result === 'string' 
                              ? selectedSession.result 
                              : JSON.stringify(selectedSession.result, null, 2)}
                          </p>
                        </div>
                        {typeof selectedSession.result === 'object' && selectedSession.result.keyTerms?.length > 0 && (
                          <div className="pt-4 border-t border-border/30">
                            <h3 className="font-semibold text-accent mb-3">Key Terms</h3>
                            <div className="space-y-3">
                              {selectedSession.result.keyTerms.map((term: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-muted/30 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                  <p className="font-medium text-primary text-sm">{term.term}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{term.definition}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : selectedSession.session_type === "quiz" && selectedSession.result ? (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10">
                          <div className="text-center">
                            <p className="text-3xl font-bold text-primary">{selectedSession.result.score || 0}%</p>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                          <div className="h-12 w-px bg-border" />
                          <div className="text-center">
                            <p className="text-xl font-bold text-accent">
                              {selectedSession.result.correctAnswers || 0}/{selectedSession.result.totalQuestions || 0}
                            </p>
                            <p className="text-xs text-muted-foreground">Correct</p>
                          </div>
                        </div>
                        {selectedSession.result.questions && (
                          <div className="space-y-4">
                            {selectedSession.result.questions.map((q: any, idx: number) => (
                              <div key={idx} className="p-4 rounded-xl bg-muted/30 animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                                <p className="font-medium text-sm mb-3">Q{idx + 1}: {q.question}</p>
                                <div className="space-y-2">
                                  {q.options.map((opt: string, optIdx: number) => {
                                    const isCorrect = optIdx === q.correctAnswer;
                                    const wasSelected = selectedSession.result.userAnswers?.[idx] === optIdx;
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`p-2 rounded-lg text-xs ${
                                          isCorrect
                                            ? "bg-accent/20 text-accent"
                                            : wasSelected
                                            ? "bg-destructive/20 text-destructive"
                                            : "bg-background/50"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}. {opt}
                                        {isCorrect && " ✓"}
                                        {wasSelected && !isCorrect && " ✗"}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                <ChevronRight className="h-6 w-6" />
              </div>
              <p className="text-lg font-medium">Select a session</p>
              <p className="text-sm">Choose a session from the list to view details</p>
            </div>
          )}
        </div>

        {/* Mobile Detail View */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 bg-background md:hidden animate-fade-in">
            <div className="flex flex-col h-full">
              <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedSession(null)}
                    className="rounded-xl h-9 w-9"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h2 className="font-bold capitalize text-sm sm:text-base">{selectedSession.session_type}</h2>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {format(new Date(selectedSession.created_at), "PPp")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadPDF(selectedSession)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSession(selectedSession.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-3 sm:p-4">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-3 sm:p-4">
                    {selectedSession.session_type === 'chat' ? (
                      <div className="space-y-2 sm:space-y-3">
                        {selectedSession.result?.conversation?.map((msg: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-2.5 sm:p-3 rounded-xl text-sm ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-br from-primary/20 to-accent/20 ml-4 sm:ml-8'
                                : 'bg-muted/50 mr-4 sm:mr-8'
                            }`}
                          >
                            <p className="text-[10px] sm:text-xs font-semibold mb-1 text-muted-foreground">
                              {msg.role === 'user' ? 'You' : 'AI'}
                            </p>
                            <p className="text-xs sm:text-sm leading-relaxed">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : selectedSession.session_type === "summary" ? (
                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-xs sm:text-sm leading-relaxed">
                          {typeof selectedSession.result === 'object' && selectedSession.result.summary 
                            ? selectedSession.result.summary 
                            : typeof selectedSession.result === 'string' 
                            ? selectedSession.result 
                            : JSON.stringify(selectedSession.result, null, 2)}
                        </p>
                        {typeof selectedSession.result === 'object' && selectedSession.result.keyTerms?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-semibold text-xs sm:text-sm text-accent">Key Terms</h4>
                            {selectedSession.result.keyTerms.map((term: any, idx: number) => (
                              <div key={idx} className="p-2 rounded-lg bg-muted/30">
                                <p className="font-medium text-primary text-xs sm:text-sm">{term.term}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{term.definition}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : selectedSession.session_type === "quiz" && selectedSession.result ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10">
                          <div className="text-center">
                            <p className="text-xl sm:text-2xl font-bold text-primary">{selectedSession.result.score || 0}%</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Score</p>
                          </div>
                          <div className="h-10 w-px bg-border" />
                          <div className="text-center">
                            <p className="text-base sm:text-lg font-bold text-accent">
                              {selectedSession.result.correctAnswers || 0}/{selectedSession.result.totalQuestions || 0}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Correct</p>
                          </div>
                        </div>
                        {selectedSession.result.questions && (
                          <div className="space-y-3">
                            {selectedSession.result.questions.map((q: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-xl bg-muted/30">
                                <p className="font-medium text-xs sm:text-sm mb-2">Q{idx + 1}: {q.question}</p>
                                <div className="space-y-1.5">
                                  {q.options.map((opt: string, optIdx: number) => {
                                    const isCorrect = optIdx === q.correctAnswer;
                                    const wasSelected = selectedSession.result.userAnswers?.[idx] === optIdx;
                                    return (
                                      <div
                                        key={optIdx}
                                        className={`p-1.5 sm:p-2 rounded-lg text-[10px] sm:text-xs ${
                                          isCorrect
                                            ? "bg-accent/20 text-accent"
                                            : wasSelected
                                            ? "bg-destructive/20 text-destructive"
                                            : "bg-background/50"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}. {opt}
                                        {isCorrect && " ✓"}
                                        {wasSelected && !isCorrect && " ✗"}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;

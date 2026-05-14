import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Brain, Loader2, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBrowserSpeech } from "@/hooks/useBrowserSpeech";
import { useVoiceMode } from "@/contexts/VoiceModeContext";

interface QuizMasterProps {
  uploadedContent: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanations?: string[];
}

const QuizMaster = ({ uploadedContent }: QuizMasterProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const { toast } = useToast();
  const { speak } = useBrowserSpeech();
  const { voiceModeEnabled } = useVoiceMode();

  const generateQuiz = async () => {
    if (!uploadedContent.trim()) {
      toast({
        title: "No content available",
        description: "Please add content in the Study Helper tab first.",
        variant: "destructive",
      });
      return;
    }

    // Check user and usage limits
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to generate quizzes.",
        variant: "destructive",
      });
      return;
    }

    // Check subscription status
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('is_paid, subscription_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const isPaid = subscription?.is_paid && 
      (!subscription.subscription_end || new Date(subscription.subscription_end) > new Date());

    // If not paid, check daily usage
    if (!isPaid) {
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('usage_tracking')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('feature', 'quiz')
        .gte('used_at', today);

      const FREE_LIMIT = 1;
      if ((count || 0) >= FREE_LIMIT) {
        toast({
          title: "Daily limit reached",
          description: "Free users can only generate 1 quiz per day. Upgrade to premium for unlimited access!",
          variant: "destructive",
        });
        return;
      }
    }

    setIsGenerating(true);
    setShowResults(false);
    setAnswers({});
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { content: uploadedContent }
      });

      if (error) throw error;

      setQuestions(data.questions);

      // Track usage for free users
      if (!isPaid) {
        await supabase.from('usage_tracking').insert({
          user_id: user.id,
          feature: 'quiz',
        });
      }

      toast({
        title: "Quiz generated!",
        description: `${data.questions.length} questions ready for you.`,
      });

      // Auto-speak first question if voice mode enabled
      if (voiceModeEnabled && data.questions.length > 0) {
        const firstQ = data.questions[0];
        const textToSpeak = `Question 1: ${firstQ.question}. Options: ${firstQ.options.map((o: string, i: number) => `${i + 1}, ${o}`).join('. ')}`;
        setTimeout(() => speak(textToSpeak), 500);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const submitQuiz = async () => {
    let correctCount = 0;
    questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correctCount++;
      }
    });
    
    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setShowResults(true);

    // Save to history
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const resultData = {
          score: finalScore,
          correctAnswers: correctCount,
          totalQuestions: questions.length,
          questions: questions.map((q, idx) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanations: q.explanations || [],
          })),
          userAnswers: Object.keys(answers).reduce((acc, key) => {
            acc[parseInt(key)] = answers[parseInt(key)];
            return acc;
          }, {} as Record<number, number>),
        };

        await supabase.from('study_sessions').insert({
          user_id: user.id,
          session_type: 'quiz',
          content_preview: uploadedContent.substring(0, 100),
          full_content: uploadedContent,
          result: resultData as any,
          image_count: 0,
        });
      }
    } catch (error) {
      console.error('Error saving quiz to history:', error);
    }
    
    const resultMessage = `You scored ${correctCount} out of ${questions.length}, that's ${finalScore} percent.`;
    toast({
      title: "Quiz submitted!",
      description: `You scored ${correctCount} out of ${questions.length}`,
    });

    // Auto-speak results if voice mode enabled
    if (voiceModeEnabled) {
      setTimeout(() => speak(resultMessage), 300);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setShowResults(false);
    setScore(0);
  };

  if (questions.length === 0) {
    return (
      <Card className="border border-border bg-card rounded-3xl shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            Generate Your Quiz
          </CardTitle>
          <CardDescription>Create an interactive quiz from your study materials.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generateQuiz}
            disabled={isGenerating}
            className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Quiz...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Generate Quiz</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {showResults && (
        <Card className="border-2 border-primary/30 rounded-3xl shadow-lg-glow bg-gradient-primary text-primary-foreground overflow-hidden animate-float-up">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-card/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold">{score}%</h3>
                  <p className="text-sm opacity-90">{score >= 80 ? "Excellent work!" : score >= 60 ? "Good job!" : "Keep practicing!"}</p>
                </div>
              </div>
              <Button onClick={resetQuiz} variant="outline" className="w-full sm:w-auto rounded-full bg-card/20 border-card/30 text-primary-foreground hover:bg-card/30">New Quiz</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="border border-border bg-card rounded-3xl shadow-card hover:shadow-lg-glow transition-shadow">
            <CardHeader className="p-5">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-primary text-primary-foreground text-xs">{qIndex + 1}</span>
                  Question {qIndex + 1}
                </CardTitle>
                {showResults && (answers[qIndex] === q.correctAnswer
                  ? <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                  : <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />)}
              </div>
              <CardDescription className="text-sm sm:text-base text-foreground mt-2 leading-relaxed">{q.question}</CardDescription>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <RadioGroup
                value={answers[qIndex]?.toString()}
                onValueChange={(v) => handleAnswerChange(qIndex, parseInt(v))}
                disabled={showResults}
                className="space-y-2.5"
              >
                {q.options.map((option, oIndex) => (
                  <div
                    key={oIndex}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                      showResults
                        ? oIndex === q.correctAnswer
                          ? "bg-success/10 border-success"
                          : answers[qIndex] === oIndex
                          ? "bg-destructive/10 border-destructive"
                          : "bg-secondary/40 border-border"
                        : "bg-secondary/40 border-border hover:border-primary/50 hover:bg-secondary/70 cursor-pointer"
                    }`}
                  >
                    <RadioGroupItem value={oIndex.toString()} id={`q${qIndex}-o${oIndex}`} className="mt-0.5" />
                    <Label htmlFor={`q${qIndex}-o${oIndex}`} className="flex-1 cursor-pointer text-sm leading-relaxed">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>

      {!showResults && (
        <Button
          onClick={submitQuiz}
          disabled={Object.keys(answers).length !== questions.length}
          className="w-full h-13 sm:h-14 text-base rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all"
        >
          Submit Quiz
        </Button>
      )}
    </div>
  );
};

export default QuizMaster;

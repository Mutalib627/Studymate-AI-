import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BrainCircuit, TrendingUp, Clock, FileText, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StudyHelper from "@/components/StudyHelper";
import QuizMaster from "@/components/QuizMaster";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Index = () => {
  const [uploadedContent, setUploadedContent] = useState<string>("");
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("study");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.activeTab) setActiveTab(location.state.activeTab);
  }, [location.state]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || "");
        const { data: roleData } = await supabase
          .from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle();
        setIsAdmin(!!roleData);
      }
      setLoading(false);
      if (!session) navigate("/landing");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setUserName(session.user.user_metadata?.full_name || "");
      if (!session) navigate("/landing");
    });

    const savedContent = localStorage.getItem('uploadedContent');
    if (savedContent) setUploadedContent(savedContent);

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (uploadedContent) localStorage.setItem('uploadedContent', uploadedContent);
  }, [uploadedContent]);

  const handleSignOut = async () => {
    localStorage.removeItem('uploadedContent');
    localStorage.removeItem('studySummary');
    localStorage.removeItem('studyKeyTerms');
    localStorage.removeItem('currentChatMessages');
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const firstName = userName?.split(" ")[0] || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <DashboardLayout
      pageTitle="Dashboard"
      userId={user.id}
      userName={userName}
      userEmail={user.email || ""}
      isAdmin={isAdmin}
      onSignOut={handleSignOut}
    >
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-6 sm:p-8 text-white shadow-lg-glow animate-float-up">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }} />
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-4 bottom-0 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">{greeting} 👋</p>
              <h2 className="text-xl sm:text-2xl font-extrabold">{firstName}!</h2>
              <p className="text-white/80 text-sm mt-1">
                {uploadedContent ? "Your study material is ready — let's go!" : "Upload a document to get started."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 text-center min-w-[80px]">
                <Sparkles className="w-4 h-4 text-white/80 mx-auto mb-1" />
                <p className="text-xs text-white/70">AI Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-float-up" style={{ animationDelay: "0.05s" }}>
          {[
            { icon: FileText, label: "Material", value: uploadedContent ? "Loaded" : "Empty", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { icon: BookOpen, label: "Summaries", value: "Ready", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
            { icon: BrainCircuit, label: "Quizzes", value: "Ready", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { icon: TrendingUp, label: "Progress", value: "Active", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
          ].map((item, i) => (
            <div
              key={i}
              className="stat-card animate-float-up"
              style={{ animationDelay: `${0.08 + i * 0.05}s` }}
            >
              <div className={`w-9 h-9 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        <div className="animate-float-up" style={{ animationDelay: "0.15s" }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-card border border-border rounded-xl shadow-card mb-5">
              <TabsTrigger
                value="study"
                className="rounded-lg font-semibold text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Study Material
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="rounded-lg font-semibold text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground"
              >
                <BrainCircuit className="w-4 h-4 mr-2" />
                Quiz Mode
              </TabsTrigger>
            </TabsList>

            <TabsContent value="study" className="mt-0 animate-scale-in">
              <StudyHelper uploadedContent={uploadedContent} setUploadedContent={setUploadedContent} />
            </TabsContent>
            <TabsContent value="quiz" className="mt-0 animate-scale-in">
              <QuizMaster uploadedContent={uploadedContent} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;

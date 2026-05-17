import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BrainCircuit, FileText, Sparkles, TrendingUp } from "lucide-react";
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
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
      activeTab={activeTab}
    >
      <div className="max-w-4xl mx-auto space-y-4">

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-5 sm:p-6 text-white shadow-lg-glow animate-float-up">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px"
          }} />
          <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/5 rounded-full" />
          <div className="relative flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">{greeting} 👋</p>
              <h2 className="text-lg sm:text-xl font-extrabold mt-0.5 truncate">{firstName}!</h2>
              <p className="text-white/75 text-xs mt-1 hidden sm:block">
                {uploadedContent ? "Your material is ready — start studying!" : "Upload a document to get started."}
              </p>
            </div>
            <div className="flex-shrink-0 flex gap-2">
              <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2 text-center">
                <Sparkles className="w-3.5 h-3.5 text-white/80 mx-auto mb-1" />
                <p className="text-[10px] text-white/70 whitespace-nowrap">AI Ready</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-float-up" style={{ animationDelay: "0.05s" }}>
          {[
            { icon: FileText, label: "Material", value: uploadedContent ? "✓ Loaded" : "Empty", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { icon: BookOpen, label: "Summary", value: "Ready", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/30" },
            { icon: BrainCircuit, label: "Quiz", value: "Ready", color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
          ].map((item, i) => (
            <div
              key={i}
              className="stat-card p-3 sm:p-4 animate-float-up"
              style={{ animationDelay: `${0.08 + i * 0.05}s` }}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg ${item.bg} flex items-center justify-center mb-2`}>
                <item.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${item.color}`} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</p>
              <p className={`text-xs sm:text-sm font-bold mt-0.5 ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="animate-float-up" style={{ animationDelay: "0.12s" }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-card border border-border rounded-xl shadow-card mb-4">
              <TabsTrigger
                value="study"
                className="rounded-lg font-semibold text-xs sm:text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                Study
              </TabsTrigger>
              <TabsTrigger
                value="quiz"
                className="rounded-lg font-semibold text-xs sm:text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-white data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground"
              >
                <BrainCircuit className="w-3.5 h-3.5 mr-1.5" />
                Quiz
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

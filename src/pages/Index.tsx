import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BrainCircuit, FileText, Check } from "lucide-react";
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
      <div className="max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 animate-float-up">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{greeting}</p>
            <h2 className="text-xl sm:text-2xl font-extrabold mt-0.5 truncate">{firstName}</h2>
          </div>
          <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${uploadedContent ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            {uploadedContent ? "Material loaded" : "No material yet"}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 animate-float-up" style={{ animationDelay: "0.05s" }}>
          {[
            { icon: FileText, label: "Material", value: uploadedContent ? "Loaded" : "Empty", done: !!uploadedContent },
            { icon: BookOpen, label: "Summary", value: uploadedContent ? "Ready" : "Not yet", done: !!uploadedContent },
            { icon: BrainCircuit, label: "Quiz", value: uploadedContent ? "Ready" : "Not yet", done: !!uploadedContent },
          ].map((item, i) => (
            <div
              key={item.label}
              className="stat-card p-3 sm:p-4 animate-float-up"
              style={{ animationDelay: `${0.08 + i * 0.05}s` }}
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/8 flex items-center justify-center mb-2">
                <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" strokeWidth={1.75} />
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{item.label}</p>
              <p className="text-xs sm:text-sm font-bold mt-0.5 flex items-center gap-1">
                {item.done && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />}
                {item.value}
              </p>
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

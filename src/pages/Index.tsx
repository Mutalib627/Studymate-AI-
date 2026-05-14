import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, BrainCircuit } from "lucide-react";
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
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      pageTitle="Dashboard"
      userId={user.id}
      userName={userName}
      userEmail={user.email || ""}
      isAdmin={isAdmin}
      onSignOut={handleSignOut}
    >
      {/* Hero / premium banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 sm:p-8 text-primary-foreground shadow-lg-glow mb-6 max-w-4xl mx-auto">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-card/20 backdrop-blur flex items-center justify-center shadow-glow flex-shrink-0">
            <span className="text-3xl">👑</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold">Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}!</h1>
            <p className="text-sm opacity-90 mt-1">Upload materials, generate summaries, and test your knowledge.</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-4xl mx-auto">
        <TabsList className="relative grid w-full grid-cols-2 h-14 p-1.5 bg-card border border-border rounded-full shadow-card mb-6">
          <TabsTrigger value="study" className="rounded-full font-semibold text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground">
            <BookOpen className="w-4 h-4 mr-2" /> Study
          </TabsTrigger>
          <TabsTrigger value="quiz" className="rounded-full font-semibold text-sm h-full transition-all data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card data-[state=inactive]:text-muted-foreground">
            <BrainCircuit className="w-4 h-4 mr-2" /> Quiz
          </TabsTrigger>
        </TabsList>

        <TabsContent value="study" className="mt-4">
          <StudyHelper uploadedContent={uploadedContent} setUploadedContent={setUploadedContent} />
        </TabsContent>
        <TabsContent value="quiz" className="mt-4">
          <QuizMaster uploadedContent={uploadedContent} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Index;

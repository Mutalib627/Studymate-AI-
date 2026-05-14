import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BookOpen, BrainCircuit, MessagesSquare, Zap, ArrowRight, Mail, Phone, Menu, X, Moon, Sun, Shield, Sparkles } from "lucide-react";
import logo from "@/assets/logo.png";

const features = [
  { icon: BookOpen, title: "Smart Summaries", description: "Upload documents and get AI-powered summaries with key terms extraction." },
  { icon: BrainCircuit, title: "Interactive Quizzes", description: "Generate custom quizzes from your study materials to test your knowledge." },
  { icon: MessagesSquare, title: "AI Chat Assistant", description: "Ask questions and get instant, helpful answers about any topic." },
  { icon: Zap, title: "Image Recognition", description: "Extract text from images and handwritten notes using advanced OCR." },
];

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate("/"); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => { if (session) navigate("/"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollToSection("top")} className="flex items-center gap-2.5">
            <img src={logo} alt="Studymate AI" className="w-9 h-9 rounded-full shadow-card object-cover bg-transparent mix-blend-multiply dark:mix-blend-normal" />
            <span className="font-bold text-lg tracking-tight">Studymate AI</span>
          </button>

          <nav className="hidden md:flex items-center gap-7">
            {["features", "about", "contact", "privacy"].map((s) => (
              <button key={s} onClick={() => scrollToSection(s)} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors capitalize">{s}</button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full h-9 w-9">
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
            <Button onClick={() => navigate("/auth")} className="hidden sm:inline-flex h-9 px-5 rounded-full bg-gradient-primary text-primary-foreground shadow-card hover:shadow-glow transition-all">Sign in</Button>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden rounded-full h-9 w-9">
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-xl animate-float-up">
            <nav className="flex flex-col p-3 space-y-1">
              {["features", "about", "contact", "privacy"].map((s) => (
                <button key={s} onClick={() => scrollToSection(s)} className="text-left py-3 px-4 rounded-xl text-foreground hover:bg-secondary transition-colors capitalize font-medium">{s}</button>
              ))}
              <Button onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }} className="mt-2 h-11 rounded-full bg-gradient-primary text-primary-foreground">Sign in</Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-primary-glow/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-32">
          <div className="text-center space-y-7 animate-float-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> AI-Powered Learning
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
              Study smarter with{" "}
              <span className="bg-gradient-hero bg-clip-text text-transparent animate-gradient">AI</span>
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Transform your study materials into interactive summaries, quizzes, and get instant AI assistance — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-lg-glow hover:shadow-glow hover:scale-[1.02] transition-all">
                Get started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="w-full sm:w-auto h-14 px-8 rounded-full font-semibold border-2 hover:border-primary hover:text-primary transition-all">
                Sign in
              </Button>
            </div>
          </div>

          {/* Floating preview card */}
          <div className="mt-16 sm:mt-20 max-w-4xl mx-auto animate-float-up" style={{ animationDelay: "0.15s" }}>
            <div className="relative rounded-3xl bg-gradient-card shadow-lg-glow border border-border p-1">
              <div className="rounded-[1.4rem] bg-gradient-primary p-8 sm:p-12 text-primary-foreground">
                <div className="grid grid-cols-3 gap-6 text-center">
                  {[
                    { n: "10K+", l: "Students" },
                    { n: "50K+", l: "Summaries" },
                    { n: "99%", l: "Accuracy" },
                  ].map((s) => (
                    <div key={s.l}>
                      <p className="text-2xl sm:text-4xl font-extrabold">{s.n}</p>
                      <p className="text-xs sm:text-sm opacity-90 mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-12 animate-float-up">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">Everything you need to excel</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Powerful tools designed for your learning workflow.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="group relative glass rounded-2xl p-6 border border-border/50 shadow-card hover:shadow-lg-glow hover:-translate-y-1 transition-all duration-300 animate-float-up"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-4 group-hover:scale-110 transition-transform">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-card border border-border shadow-card p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-4">About Studymate AI</h3>
          <p className="text-muted-foreground leading-relaxed max-w-3xl">
            Studymate AI is built to support students with fast answers, learning tools, and reliable study assistance. We leverage AI technology to transform how students interact with their study materials, making education more accessible and effective.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-card border border-border shadow-card p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-3">Get in touch</h3>
          <p className="text-muted-foreground mb-6">Have questions? Reach out through any of these channels:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="mailto:salisuabdulmutalib627@gmail.com" className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-semibold truncate">salisuabdulmutalib627@gmail.com</p>
              </div>
            </a>
            <a href="https://wa.me/2348103842992" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/50 border border-border hover:bg-secondary hover:border-primary/40 transition-all group">
              <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-semibold">08103842992</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl bg-card border border-border shadow-card p-8 sm:p-12">
          <h3 className="text-2xl sm:text-3xl font-extrabold mb-4">Privacy Policy</h3>
          <p className="text-muted-foreground mb-5">At Studymate AI, we take your privacy seriously. Your data is secure with us.</p>
          <div className="space-y-3">
            {[
              ["Data Security", "All your information is encrypted and stored securely."],
              ["No Selling", "We never sell your data to third parties."],
              ["Limited Use", "Your data is used only for account functions and app improvements."],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-2xl bg-secondary/40 border border-border">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground"><strong className="text-foreground">{title}:</strong> {desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-10 sm:p-16 text-center text-primary-foreground shadow-lg-glow">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
          <div className="relative space-y-5">
            <h3 className="text-2xl sm:text-4xl font-extrabold">Ready to transform your learning?</h3>
            <p className="text-base sm:text-lg opacity-90 max-w-md mx-auto">Join students using AI to study more efficiently and achieve better results.</p>
            <Button size="lg" onClick={() => navigate("/auth")} className="h-14 px-8 rounded-full bg-card text-primary font-semibold hover:scale-105 transition-all shadow-lg-glow">
              Get started free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="" className="w-7 h-7 rounded-lg" />
            <span className="text-sm font-semibold">Studymate AI</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Studymate AI · Built by Cybertech.IT</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

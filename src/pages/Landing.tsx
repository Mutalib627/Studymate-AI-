import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BookOpen, BrainCircuit, MessagesSquare, Zap, ArrowRight,
  Mail, Phone, Menu, X, Moon, Sun, Shield, Sparkles,
  GraduationCap, FileText, Mic, Star, CheckCircle2, ChevronRight
} from "lucide-react";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: FileText,
    title: "Smart Summaries",
    description: "Upload any document and get AI-powered proportional summaries with key terms — nothing added, nothing missing.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    icon: BrainCircuit,
    title: "Adaptive Quizzes",
    description: "Generate intelligent quizzes that scale with your material — 5 questions for a page, 50 for a textbook.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
  },
  {
    icon: MessagesSquare,
    title: "RAG-Powered Chat",
    description: "Ask questions and get answers strictly from your uploaded material. No hallucinations, no guesswork.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    icon: Zap,
    title: "OCR & Extraction",
    description: "Extract text from images, handwritten notes, PDFs, and Word documents with high accuracy.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
  {
    icon: Mic,
    title: "Voice Chat",
    description: "Speak naturally and get spoken responses. Study hands-free with intelligent voice interaction.",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
  },
  {
    icon: GraduationCap,
    title: "Study History",
    description: "Track your learning sessions, review past quizzes, and monitor your academic progress over time.",
    color: "from-cyan-500 to-sky-600",
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
  },
];

const stats = [
  { value: "10K+", label: "Active Students" },
  { value: "50K+", label: "Summaries Generated" },
  { value: "99%", label: "Accuracy Rate" },
  { value: "24/7", label: "AI Availability" },
];

const Landing = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("theme") as "light" | "dark") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">

      {/* ── Navbar ──────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">

          {/* Logo */}
          <button onClick={() => scrollTo("top")} className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card">
              <img src={logo} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg object-cover" />
            </div>
            <span className="font-bold text-sm sm:text-base tracking-tight">Studymate AI</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {["features", "about", "contact"].map((s) => (
              <button
                key={s}
                onClick={() => scrollTo(s)}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary/60 transition-all capitalize"
              >
                {s}
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            >
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <Button
              onClick={() => navigate("/auth")}
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex text-sm font-medium h-8"
            >
              Sign in
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              size="sm"
              className="h-8 px-4 text-xs sm:text-sm rounded-xl bg-gradient-primary text-white font-semibold shadow-card hover:shadow-glow transition-all"
            >
              Get started
            </Button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/60 transition-all"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border animate-float-up">
            <div className="p-3 space-y-1 max-w-6xl mx-auto">
              {["features", "about", "contact"].map((s) => (
                <button
                  key={s}
                  onClick={() => scrollTo(s)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-secondary/60 transition-all capitalize"
                >
                  {s}
                </button>
              ))}
              <div className="pt-2 flex flex-col gap-2">
                <Button variant="outline" onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }} className="h-11 rounded-xl w-full">
                  Sign in
                </Button>
                <Button onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }} className="h-11 rounded-xl w-full bg-gradient-primary text-white">
                  Get started free
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section id="top" className="relative min-h-screen flex items-center pt-14 sm:pt-16 overflow-hidden">
        {/* Background */}
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

            {/* Left */}
            <div className="space-y-6 animate-float-up text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold">
                <Sparkles className="w-3 h-3" />
                AI-Powered Study Platform
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight">
                Study smarter,{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent animate-gradient">
                  not harder
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto lg:mx-0">
                Transform your study materials into intelligent summaries, adaptive quizzes, and get instant answers — powered by cutting-edge AI.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-primary text-white font-semibold shadow-lg-glow hover:shadow-glow hover:scale-[1.02] transition-all"
                >
                  Start learning free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("features")}
                  className="w-full sm:w-auto h-12 px-7 rounded-xl font-semibold border-2 hover:border-primary/50 transition-all"
                >
                  See features
                </Button>
              </div>

              {/* Social proof */}
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-1">
                <div className="flex -space-x-2">
                  {["A", "B", "C", "D"].map((l, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-background bg-gradient-primary flex items-center justify-center text-white text-[10px] sm:text-xs font-bold"
                      style={{ zIndex: 4 - i }}
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Trusted by 10,000+ students</p>
                </div>
              </div>
            </div>

            {/* Right — preview card */}
            <div className="animate-float-up" style={{ animationDelay: "0.15s" }}>
              <div className="relative mx-auto max-w-sm lg:max-w-none">
                <div className="bg-card border border-border rounded-2xl shadow-lg-glow overflow-hidden">
                  {/* Card header */}
                  <div className="bg-gradient-primary p-5 pb-7">
                    <div className="flex items-center gap-1.5 mb-3">
                      {[1,2,3].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/25" />)}
                    </div>
                    <p className="text-white/70 text-xs mb-1">AI Summary Generated</p>
                    <p className="text-white font-semibold text-sm">Chapter 3: Cellular Respiration</p>
                  </div>

                  {/* Card body */}
                  <div className="p-4 -mt-3 space-y-3">
                    <div className="bg-card rounded-xl border border-border p-4 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <div className="h-2 bg-muted rounded-full w-full animate-shimmer" />
                          <div className="h-2 bg-muted rounded-full w-4/5 animate-shimmer" style={{ animationDelay: "0.1s" }} />
                          <div className="h-2 bg-muted rounded-full w-3/5 animate-shimmer" style={{ animationDelay: "0.2s" }} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {stats.slice(0, 3).map((s) => (
                        <div key={s.label} className="bg-secondary/60 rounded-xl p-2.5 text-center">
                          <p className="text-sm font-extrabold text-primary">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Summary generated in 3.2s</p>
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce-soft">
                  ✨ Premium
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── */}
      <section className="border-y border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((s, i) => (
              <div key={i} className="text-center animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <p className="text-xl sm:text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-10 sm:mb-14 animate-float-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Sparkles className="w-3 h-3" /> Features
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Everything you need to excel
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            Powerful AI tools designed around the way students actually study.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className={`group relative rounded-2xl border border-border p-5 ${f.bg} hover:shadow-lg-glow hover:-translate-y-1 transition-all duration-300 animate-float-up`}
              style={{ animationDelay: `${i * 0.07}s` }}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shadow-card mb-3 group-hover:scale-110 transition-transform`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-sm sm:text-base font-bold mb-1.5">{f.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ───────────────────────────────────── */}
      <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-10 animate-float-up">
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
                About Us
              </div>
              <h3 className="text-xl sm:text-3xl font-extrabold mb-3">Built for students, by students</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Studymate AI is built to support students with fast, accurate answers and powerful learning tools. We leverage cutting-edge AI to transform how students interact with their study materials.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Created by <strong className="text-foreground">Abdulmutalib Salisu</strong> — a developer passionate about improving learning with technology.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, title: "Secure", desc: "End-to-end encrypted" },
                { icon: Zap, title: "Fast", desc: "Responses in seconds" },
                { icon: BookOpen, title: "Accurate", desc: "RAG-powered answers" },
                { icon: Star, title: "Premium", desc: "Pro-grade AI models" },
              ].map((item, i) => (
                <div key={i} className="bg-secondary/50 rounded-xl p-3 sm:p-4 border border-border hover:border-primary/30 transition-colors">
                  <item.icon className="w-4 h-4 text-primary mb-2" />
                  <p className="font-semibold text-xs sm:text-sm">{item.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ─────────────────────────────────── */}
      <section id="contact" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-10 animate-float-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
            Contact
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold mb-2">Get in touch</h3>
          <p className="text-sm text-muted-foreground mb-6">Have questions? Reach out through any of these channels.</p>

          <div className="flex flex-col gap-3">
            {/* Email */}
            <a
              href="mailto:salisuabdulmutalib627@gmail.com"
              className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all group w-full overflow-hidden"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:shadow-glow group-hover:scale-105 transition-all flex-shrink-0">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <p className="text-xs sm:text-sm font-semibold break-all leading-tight">salisuabdulmutalib627@gmail.com</p>
              </div>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/2348103842992"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all group w-full"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:shadow-glow group-hover:scale-105 transition-all flex-shrink-0">
                <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">WhatsApp</p>
                <p className="text-xs sm:text-sm font-semibold">+234 810 384 2992</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Privacy ─────────────────────────────────── */}
      <section id="privacy" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="rounded-2xl bg-card border border-border shadow-card p-6 sm:p-10 animate-float-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/20 text-primary text-xs font-semibold mb-4">
            Privacy
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold mb-2">Privacy Policy</h3>
          <p className="text-sm text-muted-foreground mb-5">We take your privacy seriously. Your data is safe with us.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              ["🔒", "Data Security", "All information is encrypted and stored securely."],
              ["🚫", "No Selling", "We never sell your data to third parties."],
              ["✅", "Limited Use", "Data is only used for app functionality."],
            ].map(([emoji, title, desc]) => (
              <div key={String(title)} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
                <span className="text-lg flex-shrink-0">{emoji}</span>
                <div>
                  <p className="font-semibold text-xs sm:text-sm mb-1">{title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 sm:p-14 text-center text-white shadow-lg-glow animate-float-up">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px"
          }} />
          <div className="relative space-y-4">
            <h3 className="text-xl sm:text-4xl font-extrabold">Ready to transform your learning?</h3>
            <p className="text-sm sm:text-lg opacity-90 max-w-md mx-auto">
              Join thousands of students studying smarter with AI.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="h-12 sm:h-14 px-8 sm:px-10 rounded-xl bg-white text-primary font-bold hover:scale-105 transition-all shadow-lg"
            >
              Get started free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <img src={logo} alt="" className="w-5 h-5 rounded object-cover" />
              </div>
              <span className="text-sm font-bold">Studymate AI</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} Studymate AI · Built by Cybertech.IT
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <button onClick={() => scrollTo("privacy")} className="hover:text-foreground transition-colors">Privacy</button>
              <button onClick={() => scrollTo("contact")} className="hover:text-foreground transition-colors">Contact</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

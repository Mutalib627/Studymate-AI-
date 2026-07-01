import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  BookOpen, BrainCircuit, MessagesSquare, Zap, ArrowRight,
  Mail, Phone, Menu, X, Moon, Sun, Shield,
  GraduationCap, FileText, Mic, Star, CheckCircle2, Lock, Ban,
  Upload, MessageCircle
} from "lucide-react";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: FileText,
    title: "Smart summaries",
    description: "Upload any document and get a proportional summary with key terms pulled out — nothing added, nothing missing.",
  },
  {
    icon: BrainCircuit,
    title: "Adaptive quizzes",
    description: "Quizzes scale with your material — five questions for a page, fifty for a full textbook chapter.",
  },
  {
    icon: MessagesSquare,
    title: "RAG-powered chat",
    description: "Ask questions and get answers pulled strictly from what you uploaded — not a general guess.",
  },
  {
    icon: Zap,
    title: "OCR & extraction",
    description: "Pull clean text out of images, handwritten notes, PDFs, and Word documents.",
  },
  {
    icon: Mic,
    title: "Voice chat",
    description: "Speak your question and get a spoken answer back — study hands-free between classes.",
  },
  {
    icon: GraduationCap,
    title: "Study history",
    description: "Every session, summary, and quiz is saved so you can go back and review your progress.",
  },
];

const steps = [
  { icon: Upload, title: "Upload", description: "A PDF, a photo of your notes, or a pasted paragraph — whatever you're working from." },
  { icon: BrainCircuit, title: "Studymate reads it", description: "It builds a summary, a quiz, or answers straight from that material." },
  { icon: MessageCircle, title: "You ask, it answers", description: "Keep chatting about the material until it actually makes sense." },
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
      <section id="top" className="relative pt-24 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-start">

            {/* Left */}
            <div className="space-y-6 animate-float-up">
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary">
                Studymate AI
              </p>

              <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-extrabold leading-[1.12] tracking-tight text-balance">
                Turn your notes into{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  something you'll actually remember
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                Upload a PDF, a photo of your notes, or a textbook chapter. Studymate reads it, summarizes it,
                quizzes you on it, and answers your questions — using only what you gave it, nothing made up.
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-3 pt-1">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="w-full sm:w-auto h-12 px-7 rounded-xl bg-gradient-primary text-white font-semibold shadow-lg-glow hover:shadow-glow transition-all"
                >
                  Start studying free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo("features")}
                  className="w-full sm:w-auto h-12 px-7 rounded-xl font-semibold border-2 hover:border-primary/50 transition-all"
                >
                  See what it does
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">No credit card needed to get started.</p>
            </div>

            {/* Right — a real example, not a mock loading screen */}
            <div className="animate-float-up lg:pt-2" style={{ animationDelay: "0.12s" }}>
              <div className="relative mx-auto max-w-sm lg:max-w-none space-y-3">
                <div className="bg-card border border-border rounded-2xl shadow-card p-4 sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Summary · Cellular Respiration, Ch. 3
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    Cellular respiration converts glucose and oxygen into ATP across three stages — glycolysis,
                    the Krebs cycle, and the electron transport chain — releasing carbon dioxide and water as
                    byproducts.
                  </p>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-card p-4 sm:p-5 ml-4 sm:ml-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Quiz question
                  </p>
                  <p className="text-sm font-medium text-foreground mb-3">
                    Which stage of cellular respiration produces the most ATP?
                  </p>
                  <div className="space-y-1.5">
                    {["Glycolysis", "Krebs cycle", "Electron transport chain"].map((opt, i) => (
                      <div
                        key={opt}
                        className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                          i === 2
                            ? "border-primary/40 bg-primary/5 text-foreground font-medium"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {i === 2 && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section className="border-y border-border bg-card/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="flex items-start gap-3.5 animate-float-up" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl border border-primary/25 bg-primary/5 flex items-center justify-center text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div>
                  <h3 className="text-sm font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-xl mb-10 sm:mb-14 animate-float-up">
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary mb-3">Features</p>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            What it actually does
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Built around the way students actually study — not a list of buzzwords.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group relative bg-card p-5 sm:p-6 hover:bg-secondary/40 transition-colors duration-200 animate-float-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <f.icon className="w-5 h-5 text-primary mb-4" strokeWidth={1.75} />
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
              <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary mb-3">About</p>
              <h3 className="text-xl sm:text-3xl font-extrabold mb-3">Built for students, by a student</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Studymate AI started as a way to actually get through dense course material faster — turning
                readings into summaries and quizzes instead of just re-reading the same page five times.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-3">
                Built and maintained by <strong className="text-foreground">Abdulmutalib Salisu</strong>.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, title: "Secure", desc: "End-to-end encrypted" },
                { icon: Zap, title: "Fast", desc: "Responses in seconds" },
                { icon: BookOpen, title: "Accurate", desc: "Answers from your material" },
                { icon: Star, title: "Reliable", desc: "Built for daily use" },
              ].map((item) => (
                <div key={item.title} className="bg-secondary/50 rounded-xl p-3 sm:p-4 border border-border hover:border-primary/30 transition-colors">
                  <item.icon className="w-4 h-4 text-primary mb-2" strokeWidth={1.75} />
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
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary mb-3">Contact</p>
          <h3 className="text-xl sm:text-3xl font-extrabold mb-2">Get in touch</h3>
          <p className="text-sm text-muted-foreground mb-6">Have questions? Reach out through any of these channels.</p>

          <div className="flex flex-col gap-3">
            {/* Email */}
            <a
              href="mailto:salisuabdulmutalib627@gmail.com"
              className="flex items-center gap-3 sm:gap-4 p-4 rounded-xl bg-secondary/50 border border-border hover:border-primary/40 hover:bg-secondary transition-all group w-full overflow-hidden"
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:shadow-glow transition-all flex-shrink-0">
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
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-primary flex items-center justify-center shadow-card group-hover:shadow-glow transition-all flex-shrink-0">
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
          <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary mb-3">Privacy</p>
          <h3 className="text-xl sm:text-3xl font-extrabold mb-2">Privacy policy</h3>
          <p className="text-sm text-muted-foreground mb-5">We take your privacy seriously. Your data is safe with us.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: Lock, title: "Data security", desc: "All information is encrypted and stored securely." },
              { icon: Ban, title: "No selling", desc: "We never sell your data to third parties." },
              { icon: CheckCircle2, title: "Limited use", desc: "Data is only used for app functionality." },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-xl bg-secondary/40 border border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8 sm:p-14 text-center text-white shadow-lg-glow animate-float-up">
          <div className="relative space-y-4">
            <h3 className="text-xl sm:text-4xl font-extrabold">Try it with your next assignment</h3>
            <p className="text-sm sm:text-lg opacity-90 max-w-md mx-auto">
              Upload something you're studying right now and see what comes back.
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

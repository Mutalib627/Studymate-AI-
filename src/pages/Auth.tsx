import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

type Mode = "signin" | "signup";

// Moved OUTSIDE component to fix keyboard lag
const FloatField = ({
  id, type = "text", value, onChange, label, autoComplete,
}: {
  id: string; type?: string; value: string;
  onChange: (v: string) => void; label: string; autoComplete?: string;
}) => (
  <div className="floating-input">
    <input
      id={id} type={type} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=" " autoComplete={autoComplete} required
    />
    <label htmlFor={id}>{label}</label>
  </div>
);

// Moved OUTSIDE component to fix keyboard lag
const PasswordField = ({
  id, value, onChange, label, show, toggle, error, success,
}: {
  id: string; value: string; onChange: (v: string) => void;
  label: string; show: boolean; toggle: () => void;
  error?: boolean; success?: boolean;
}) => (
  <div className="floating-input">
    <input
      id={id} type={show ? "text" : "password"} value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder=" " required
      className={error ? "!border-destructive" : success ? "!border-success" : ""}
      style={{ paddingRight: "3rem" }}
    />
    <label htmlFor={id}>{label}</label>
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); toggle(); }}
      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>
);

const Auth = () => {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const isStrong = strength >= 4;
  const matches = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate("/"); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (s) navigate("/"); });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrong) return toast({ title: "Weak password", description: "Please create a stronger password", variant: "destructive" });
    if (!matches) return toast({ title: "Passwords don't match", variant: "destructive" });
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: `${window.location.origin}/` } });
      if (error) throw error;
      toast({ title: "Account created!", description: "Welcome to Studymate AI" });
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const name = data.user?.user_metadata?.full_name || email.split("@")[0];
      toast({ title: `Welcome back, ${name}!` });
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      toast({ title: "Reset link sent!", description: "Check your email." });
    } catch (err: any) {
      toast({ title: "Reset failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/15 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-glow/15 rounded-full blur-3xl -z-10" />

      <Link to="/landing" className="absolute top-4 left-4">
        <Button variant="ghost" className="gap-2 rounded-full">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </Link>

      <div className="w-full max-w-md animate-float-up">
        <div className="text-center mb-6">
          <img src={logo} alt="Studymate AI" className="w-16 h-16 mx-auto rounded-full shadow-lg-glow mb-4 object-cover bg-transparent mix-blend-multiply dark:mix-blend-normal" />
          <h1 className="text-2xl font-extrabold">Studymate AI</h1>
          <p className="text-sm text-muted-foreground mt-1">{resetMode ? "Reset your password" : "Welcome — let's get learning"}</p>
        </div>

        <div className="bg-card rounded-3xl shadow-lg-glow border border-border p-6 sm:p-8">
          {resetMode ? (
            <form onSubmit={onReset} className="space-y-5">
              <FloatField id="reset-email" type="email" value={email} onChange={setEmail} label="Email address" autoComplete="email" />
              <Button type="submit" className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Send reset link
              </Button>
              <Button type="button" variant="ghost" className="w-full rounded-full" onClick={() => setResetMode(false)}>Back to sign in</Button>
            </form>
          ) : (
            <>
              <div className="relative grid grid-cols-2 mb-6 p-1 bg-secondary rounded-full">
                <div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-primary rounded-full shadow-card transition-transform duration-300"
                  style={{ transform: mode === "signin" ? "translateX(0)" : "translateX(calc(100% + 8px))" }}
                />
                {(["signin", "signup"] as Mode[]).map((m) => (
                  <button
                    key={m} onClick={() => setMode(m)} type="button"
                    className={`relative z-10 py-2.5 text-sm font-semibold rounded-full transition-colors ${mode === m ? "text-primary-foreground" : "text-muted-foreground"}`}
                  >
                    {m === "signin" ? "Sign In" : "Sign Up"}
                  </button>
                ))}
              </div>

              {mode === "signin" ? (
                <form onSubmit={onSignIn} className="space-y-4">
                  <FloatField id="signin-email" type="email" value={email} onChange={setEmail} label="Email address" autoComplete="email" />
                  <PasswordField id="signin-password" value={password} onChange={setPassword} label="Password" show={showPassword} toggle={() => setShowPassword(!showPassword)} />
                  <Button type="submit" className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Sign In
                  </Button>
                  <button type="button" onClick={() => setResetMode(true)} className="w-full text-sm text-primary hover:underline font-medium">Forgot password?</button>
                </form>
              ) : (
                <form onSubmit={onSignUp} className="space-y-4">
                  <FloatField id="signup-name" value={fullName} onChange={setFullName} label="Full name" autoComplete="name" />
                  <FloatField id="signup-email" type="email" value={email} onChange={setEmail} label="Email address" autoComplete="email" />
                  <PasswordField id="signup-password" value={password} onChange={setPassword} label="Create password" show={showPassword} toggle={() => setShowPassword(!showPassword)} />
                  {password && (
                    <div className="space-y-2 px-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((l) => (
                          <div key={l} className={`h-1 flex-1 rounded-full transition-all ${strength >= l ? (l <= 2 ? "bg-destructive" : l <= 3 ? "bg-yellow-500" : "bg-success") : "bg-muted"}`} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        {Object.entries({ "8+ chars": checks.length, Uppercase: checks.upper, Lowercase: checks.lower, Number: checks.number, Special: checks.special }).map(([k, ok]) => (
                          <div key={k} className={`flex items-center gap-1 ${ok ? "text-success" : "text-muted-foreground"}`}>
                            {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}<span>{k}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <PasswordField id="signup-confirm" value={confirmPassword} onChange={setConfirmPassword} label="Confirm password" show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} error={!!confirmPassword && !matches} success={matches} />
                  <Button type="submit" className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all" disabled={loading || !isStrong || !matches}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create account
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">By continuing you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
};

export default Auth;

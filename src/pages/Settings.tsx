import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import ProductKeyRedemption from "@/components/ProductKeyRedemption";
import { User, Lock, Palette, Key, HelpCircle, Power, Loader2, Moon, Sun, ExternalLink, Check, X } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Settings = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      const name = session.user.user_metadata?.full_name || "";
      setUserName(name);
      setFullName(name);
      setEmail(session.user.email || "");
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roleData);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      // Update profiles table
      await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user.id);

      setUserName(fullName);
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const settingsPasswordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };
  const settingsPasswordStrength = Object.values(settingsPasswordChecks).filter(Boolean).length;
  const isSettingsPasswordStrong = settingsPasswordStrength >= 4;
  const settingsPasswordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleChangePassword = async () => {
    if (!isSettingsPasswordStrong) {
      toast({
        title: "Weak password",
        description: "Password must be 8+ characters with uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      return;
    }

    if (!settingsPasswordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout
      pageTitle="Settings"
      userId={user.id}
      userName={userName}
      userEmail={user.email || ""}
      isAdmin={isAdmin}
      onSignOut={handleSignOut}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Account Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Account</CardTitle>
                <CardDescription>Manage your account information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                disabled
                className="h-12 bg-muted/50"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              className="h-12 px-6 rounded-xl"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Password Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl">Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
              />
              {newPassword && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${settingsPasswordStrength >= level ? (level <= 2 ? "bg-destructive" : level <= 3 ? "bg-yellow-500" : "bg-accent") : "bg-muted"}`} />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { passed: settingsPasswordChecks.length, label: "8+ characters" },
                      { passed: settingsPasswordChecks.uppercase, label: "Uppercase" },
                      { passed: settingsPasswordChecks.lowercase, label: "Lowercase" },
                      { passed: settingsPasswordChecks.number, label: "Number" },
                      { passed: settingsPasswordChecks.special, label: "Special char" },
                    ].map(({ passed, label }) => (
                      <div key={label} className={`flex items-center gap-1.5 transition-colors ${passed ? "text-accent" : "text-muted-foreground"}`}>
                        {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="h-12"
              />
              {confirmPassword && (
                <p className={`text-xs flex items-center gap-1 ${settingsPasswordsMatch ? "text-accent" : "text-destructive"}`}>
                  {settingsPasswordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {settingsPasswordsMatch ? "Passwords match" : "Passwords don't match"}
                </p>
              )}
            </div>
            <Button 
              onClick={handleChangePassword} 
              disabled={passwordLoading || !isSettingsPasswordStrong || !settingsPasswordsMatch}
              variant="secondary"
              className="h-12 px-6 rounded-xl"
            >
              {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        {/* Access & Product Key Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Access & Product Key</CardTitle>
                <CardDescription>Manage your subscription and redeem product keys</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ProductKeyRedemption userId={user.id} />
          </CardContent>
        </Card>

        {/* Theme Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl">Theme</CardTitle>
                <CardDescription>Choose your preferred appearance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-3">
                {theme === "light" ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {theme === "light" ? "Light Mode" : "Dark Mode"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {theme === "light" ? "Bright and clean interface" : "Easy on the eyes"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl">Help & Support</CardTitle>
                <CardDescription>Get assistance and find answers</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-between h-12 rounded-xl">
              <span>FAQ</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="w-full justify-between h-12 rounded-xl">
              <span>Contact Support</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full h-14 rounded-xl text-base font-semibold"
            >
              <Power className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;

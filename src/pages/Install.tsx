import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, Monitor, CheckCircle2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="absolute top-6 left-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <div className="w-24 h-24 rounded-3xl overflow-hidden bg-gradient-to-br from-primary to-accent shadow-xl mb-8">
        <img src={logo} alt="StudyHelper Logo" className="w-full h-full object-cover" />
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-2">Install StudyHelper</h1>
      <p className="text-muted-foreground text-center mb-8 max-w-md">
        Install our app for a faster, offline-capable experience on your device
      </p>

      {isInstalled ? (
        <Card className="w-full max-w-md border-green-500/50 bg-green-500/10">
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
            <div>
              <h3 className="font-semibold text-foreground">Already Installed!</h3>
              <p className="text-sm text-muted-foreground">
                StudyHelper is installed on your device
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="w-full max-w-md space-y-6">
          {deferredPrompt && (
            <Button
              onClick={handleInstall}
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-2xl"
            >
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          )}

          {isIOS && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Smartphone className="w-5 h-5 text-primary" />
                  Install on iPhone/iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To install on iOS:
                </p>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>Tap the <strong>Share</strong> button in Safari</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                  <li>Tap <strong>"Add"</strong> to confirm</li>
                </ol>
              </CardContent>
            </Card>
          )}

          {!isIOS && !deferredPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Monitor className="w-5 h-5 text-primary" />
                  Install from Browser
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To install on desktop/Android:
                </p>
                <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                  <li>Click the <strong>install icon</strong> in your browser's address bar</li>
                  <li>Or open browser menu and select <strong>"Install App"</strong></li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default Install;

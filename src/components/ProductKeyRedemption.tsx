import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, CheckCircle, Crown, Mail, CreditCard, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProductKeyRedemptionProps {
  userId: string;
}

const ProductKeyRedemption = ({ userId }: ProductKeyRedemptionProps) => {
  const [keyCode, setKeyCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const redeemKey = async () => {
    if (!keyCode.trim()) {
      toast.error("Please enter a product key");
      return;
    }
    setIsRedeeming(true);
    try {
      const { data: keyData, error: keyError } = await supabase
        .from("product_keys")
        .select("*")
        .eq("key_code", keyCode.trim().toUpperCase())
        .eq("is_used", false)
        .maybeSingle();

      if (keyError) throw keyError;
      if (!keyData) {
        toast.error("Invalid or already used product key");
        setIsRedeeming(false);
        return;
      }

      await supabase
        .from("product_keys")
        .update({ is_used: true, used_by: userId, used_at: new Date().toISOString() })
        .eq("id", keyData.id);

      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + keyData.duration_days);

      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        const currentEnd = existingSub.subscription_end
          ? new Date(existingSub.subscription_end)
          : new Date();
        const newEnd = currentEnd > new Date()
          ? new Date(currentEnd.getTime() + keyData.duration_days * 24 * 60 * 60 * 1000)
          : subscriptionEnd;
        await supabase
          .from("user_subscriptions")
          .update({ is_paid: true, subscription_end: newEnd.toISOString() })
          .eq("user_id", userId);
      } else {
        await supabase.from("user_subscriptions").insert({
          user_id: userId,
          is_paid: true,
          subscription_start: new Date().toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });
      }

      toast.success(`Premium activated for ${keyData.duration_days} days`);
      setKeyCode("");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error redeeming key:", error);
      toast.error("Failed to redeem product key");
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50 transition-all gap-1.5"
        >
          <Key className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Redeem Key</span>
          <span className="sm:hidden">Key</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[92vw] max-w-sm mx-auto rounded-2xl p-0 overflow-hidden border border-border">
        <div className="p-5 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Crown className="h-4 w-4 text-amber-500" />
              Get Premium Access
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your product key or follow the payment steps below.
            </DialogDescription>
          </DialogHeader>

          {/* Payment info */}
          <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="text-xs font-semibold">Pay <span className="text-primary font-bold">₦2,000/month</span> to activate</p>
            </div>

            <div className="rounded-xl bg-card border border-emerald-200 dark:border-emerald-900 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center pb-1.5 border-b border-border">
                <span className="text-muted-foreground font-medium uppercase text-[10px] tracking-wide">Opay Account</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 text-[10px] font-bold">RECOMMENDED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number</span>
                <span className="font-mono font-bold">8103842992</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-bold text-right">Cybertech.IT</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
              <span>
                Send proof to:{" "}
                <a href="mailto:salisuabdulmutalib627@gmail.com" className="text-primary font-medium break-all">
                  salisuabdulmutalib627@gmail.com
                </a>
              </span>
            </div>
          </div>

          {/* Key input */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Enter your product key:</p>
            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
              className="text-center font-mono tracking-wider h-11 rounded-xl text-sm"
            />
            <Button
              onClick={redeemKey}
              disabled={isRedeeming || !keyCode.trim()}
              className="w-full h-11 rounded-xl bg-gradient-primary text-white font-semibold shadow-card hover:shadow-glow transition-all"
            >
              {isRedeeming ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" /> Redeem Key</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductKeyRedemption;

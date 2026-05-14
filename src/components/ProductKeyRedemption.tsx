import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Key, CheckCircle, Crown, Mail, Phone, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

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
      // Find the key
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

      // Mark key as used
      const { error: updateKeyError } = await supabase
        .from("product_keys")
        .update({
          is_used: true,
          used_by: userId,
          used_at: new Date().toISOString(),
        })
        .eq("id", keyData.id);

      if (updateKeyError) throw updateKeyError;

      // Calculate subscription end date
      const subscriptionEnd = new Date();
      subscriptionEnd.setDate(subscriptionEnd.getDate() + keyData.duration_days);

      // Check if user already has a subscription
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingSub) {
        // Extend existing subscription
        const currentEnd = existingSub.subscription_end 
          ? new Date(existingSub.subscription_end) 
          : new Date();
        const newEnd = currentEnd > new Date() 
          ? new Date(currentEnd.getTime() + keyData.duration_days * 24 * 60 * 60 * 1000)
          : subscriptionEnd;

        await supabase
          .from("user_subscriptions")
          .update({
            is_paid: true,
            subscription_end: newEnd.toISOString(),
          })
          .eq("user_id", userId);
      } else {
        // Create new subscription
        await supabase.from("user_subscriptions").insert({
          user_id: userId,
          is_paid: true,
          subscription_start: new Date().toISOString(),
          subscription_end: subscriptionEnd.toISOString(),
        });
      }

      toast.success(`Product key redeemed! Premium access for ${keyData.duration_days} days`);
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
    <div className="space-y-6">
      {/* Payment instructions card */}
      <Card className="border-0 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 lg:hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-card">
              <CreditCard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-base">How to Get Your Product Key</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pay <span className="font-extrabold text-primary">₦2,000</span> for a monthly subscription to this account:
              </p>
            </div>
          </div>

          {/* Opay highlighted box */}
          <div className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-0.5 shadow-card">
            <div className="rounded-[1rem] bg-card p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Opay Account</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px] font-bold">RECOMMENDED</span>
              </div>
              <p className="flex justify-between"><span className="text-muted-foreground">Number</span><span className="font-mono font-bold">8103842992</span></p>
              <p className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-bold">Opay</span></p>
              <p className="flex justify-between gap-2"><span className="text-muted-foreground flex-shrink-0">Name</span><span className="font-bold text-right">Cybertech.IT / Abdulmutalib Salisu</span></p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-2xl bg-primary/5 border border-primary/20">
            <Mail className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-relaxed">
              Send payment evidence to: <a href="mailto:salisuabdulmutalib627@gmail.com" className="font-semibold text-primary hover:underline break-all">salisuabdulmutalib627@gmail.com</a>
            </p>
          </div>

          <p className="text-xs text-muted-foreground italic">Your product key will be sent after confirmation.</p>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full h-12 rounded-full gap-2 bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow transition-all">
            <Key className="h-5 w-5" /> Enter Product Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md mx-4 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-amber-500" /> Redeem Product Key</DialogTitle>
            <DialogDescription>Enter your product key to unlock premium features</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={keyCode}
              onChange={(e) => setKeyCode(e.target.value.toUpperCase())}
              className="text-center font-mono tracking-wider h-12 rounded-2xl"
            />
            <Button onClick={redeemKey} disabled={isRedeeming} className="w-full h-12 rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-card hover:shadow-glow">
              {isRedeeming ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (<><CheckCircle className="h-4 w-4 mr-2" /> Redeem Key</>)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductKeyRedemption;
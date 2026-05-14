import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";

interface SubscriptionBadgeProps {
  userId: string;
}

const SubscriptionBadge = ({ userId }: SubscriptionBadgeProps) => {
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('is_paid, subscription_end')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        const isActive = data.is_paid && 
          (!data.subscription_end || new Date(data.subscription_end) > new Date());
        setIsPaid(isActive);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [userId]);

  if (loading) return null;

  return (
    <Badge
      variant={isPaid ? "default" : "secondary"}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full ${
        isPaid
          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-card"
          : "bg-secondary text-muted-foreground border border-border"
      }`}
    >
      {isPaid ? (<><Crown className="w-3.5 h-3.5" /> Premium</>) : (<><Sparkles className="w-3.5 h-3.5" /> Free Plan</>)}
    </Badge>
  );
};

export default SubscriptionBadge;

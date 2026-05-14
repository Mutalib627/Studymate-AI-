-- Create user subscriptions table to track paid status
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  subscription_start TIMESTAMP WITH TIME ZONE,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage tracking table
CREATE TABLE public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_usage_tracking_user_date ON public.usage_tracking(user_id, feature, used_at);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for usage_tracking
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
ON public.usage_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Function to check if user can use a feature
CREATE OR REPLACE FUNCTION public.check_feature_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_free_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_paid BOOLEAN;
  v_usage_count INTEGER;
BEGIN
  -- Check if user is paid
  SELECT is_paid INTO v_is_paid
  FROM user_subscriptions
  WHERE user_id = p_user_id
    AND (subscription_end IS NULL OR subscription_end > now());
  
  -- If paid user, always allow
  IF v_is_paid = true THEN
    RETURN true;
  END IF;
  
  -- Count today's usage for free users
  SELECT COUNT(*) INTO v_usage_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND feature = p_feature
    AND used_at = CURRENT_DATE;
  
  RETURN v_usage_count < p_free_limit;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
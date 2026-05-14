-- Create product_keys table
CREATE TABLE public.product_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_code text UNIQUE NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_keys ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a key exists (for redemption)
CREATE POLICY "Anyone can view unused keys for redemption"
ON public.product_keys
FOR SELECT
USING (is_used = false);

-- Users can see their own used keys
CREATE POLICY "Users can view their redeemed keys"
ON public.product_keys
FOR SELECT
USING (used_by = auth.uid());

-- Allow authenticated users to update keys (for redemption)
CREATE POLICY "Authenticated users can redeem keys"
ON public.product_keys
FOR UPDATE
USING (is_used = false)
WITH CHECK (used_by = auth.uid());
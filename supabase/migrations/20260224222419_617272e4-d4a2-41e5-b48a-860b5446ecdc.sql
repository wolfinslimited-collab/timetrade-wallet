
-- Create config table
CREATE TABLE public.config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read config" ON public.config FOR SELECT USING (true);

-- Seed show_staking default
INSERT INTO public.config (key, value) VALUES ('show_staking', 'true'::jsonb);

-- Remove from wallet_users
ALTER TABLE public.wallet_users DROP COLUMN show_staking;

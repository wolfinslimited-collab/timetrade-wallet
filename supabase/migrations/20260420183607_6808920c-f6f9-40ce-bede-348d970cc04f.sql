-- Ensure key is unique so we can ON CONFLICT on it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'config_key_unique'
  ) THEN
    ALTER TABLE public.config ADD CONSTRAINT config_key_unique UNIQUE (key);
  END IF;
END $$;

-- Remove old non-platform flags
DELETE FROM public.config WHERE key IN ('show_staking', 'show_swap', 'exchange_enabled');

-- Insert 12 platform-specific flags, defaulting to false
INSERT INTO public.config (key, value) VALUES
  ('show_staking_iphone', 'false'::jsonb),
  ('show_staking_android', 'false'::jsonb),
  ('show_staking_web', 'false'::jsonb),
  ('show_swap_iphone', 'false'::jsonb),
  ('show_swap_android', 'false'::jsonb),
  ('show_swap_web', 'false'::jsonb),
  ('exchange_enabled_iphone', 'false'::jsonb),
  ('exchange_enabled_android', 'false'::jsonb),
  ('exchange_enabled_web', 'false'::jsonb),
  ('show_ai_trade_iphone', 'false'::jsonb),
  ('show_ai_trade_android', 'false'::jsonb),
  ('show_ai_trade_web', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
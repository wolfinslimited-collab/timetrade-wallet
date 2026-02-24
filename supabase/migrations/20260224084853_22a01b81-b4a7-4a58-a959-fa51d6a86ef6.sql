
CREATE TABLE public.wallet_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_name text NOT NULL DEFAULT 'Main Wallet',
  evm_address text,
  solana_address text,
  tron_address text,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (no auth in this app)
CREATE POLICY "Anyone can insert wallet_users"
  ON public.wallet_users FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read their own record by address
CREATE POLICY "Anyone can read wallet_users"
  ON public.wallet_users FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_wallet_users_updated_at
  BEFORE UPDATE ON public.wallet_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

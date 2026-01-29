-- Create table to store platform staking wallet addresses per chain
CREATE TABLE public.stake_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain TEXT NOT NULL UNIQUE, -- e.g. 'ethereum', 'polygon', 'solana', 'tron', 'bsc'
  wallet_address TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stake_wallets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (frontend needs destination for transfer)
CREATE POLICY "Anyone can read stake wallets"
  ON public.stake_wallets
  FOR SELECT
  USING (true);

-- Add trigger for updated_at (assumes function already exists)
CREATE TRIGGER update_stake_wallets_updated_at
  BEFORE UPDATE ON public.stake_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default placeholder rows (addresses to be filled by admin)
INSERT INTO public.stake_wallets (chain, wallet_address) VALUES
  ('ethereum', ''),
  ('polygon', ''),
  ('solana', ''),
  ('tron', ''),
  ('bsc', '');

-- Add tx_hash column to staking_positions to record on-chain tx
ALTER TABLE public.staking_positions
  ADD COLUMN IF NOT EXISTS tx_hash TEXT;
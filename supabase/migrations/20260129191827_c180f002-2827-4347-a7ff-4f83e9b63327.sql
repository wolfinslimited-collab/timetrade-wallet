-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create staking_positions table to track user stakes
CREATE TABLE public.staking_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'ethereum',
  amount DECIMAL(28, 18) NOT NULL,
  apy_rate DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  staked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  earned_rewards DECIMAL(28, 18) NOT NULL DEFAULT 0,
  last_reward_calculation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for wallet lookups
CREATE INDEX idx_staking_positions_wallet ON public.staking_positions(wallet_address);
CREATE INDEX idx_staking_positions_active ON public.staking_positions(is_active);

-- Enable RLS
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (wallet-based, no auth required)
CREATE POLICY "Anyone can view staking positions by wallet" 
ON public.staking_positions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create staking positions" 
ON public.staking_positions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update their staking positions" 
ON public.staking_positions 
FOR UPDATE 
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_staking_positions_updated_at
BEFORE UPDATE ON public.staking_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
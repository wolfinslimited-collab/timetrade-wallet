CREATE TABLE public.unstake_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.staking_positions(id),
  wallet_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'ethereum',
  staked_amount NUMERIC NOT NULL,
  earned_rewards NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.unstake_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read unstake_requests"
  ON public.unstake_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert unstake_requests"
  ON public.unstake_requests FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_unstake_requests_updated_at
  BEFORE UPDATE ON public.unstake_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Drop the overly permissive INSERT and UPDATE policies
DROP POLICY IF EXISTS "Anyone can create staking positions" ON public.staking_positions;
DROP POLICY IF EXISTS "Anyone can update their staking positions" ON public.staking_positions;

-- Add unique constraint on tx_hash to prevent duplicates at DB level
ALTER TABLE public.staking_positions ADD CONSTRAINT staking_positions_tx_hash_unique UNIQUE (tx_hash);

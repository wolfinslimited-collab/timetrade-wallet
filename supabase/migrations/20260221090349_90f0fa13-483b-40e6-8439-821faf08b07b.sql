-- Remove permissive public SELECT policy on staking_positions
DROP POLICY IF EXISTS "Anyone can view staking positions by wallet" ON public.staking_positions;
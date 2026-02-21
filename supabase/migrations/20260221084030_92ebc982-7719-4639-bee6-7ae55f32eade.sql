-- Remove permissive public SELECT policy on stake_wallets
DROP POLICY IF EXISTS "Anyone can read stake wallets" ON public.stake_wallets;
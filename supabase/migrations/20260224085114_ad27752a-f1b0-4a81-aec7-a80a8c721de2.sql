
ALTER TABLE public.wallet_users
  DROP COLUMN IF EXISTS evm_address,
  DROP COLUMN IF EXISTS solana_address,
  DROP COLUMN IF EXISTS tron_address,
  ADD COLUMN ip_address text,
  ADD COLUMN country text,
  ADD COLUMN city text;

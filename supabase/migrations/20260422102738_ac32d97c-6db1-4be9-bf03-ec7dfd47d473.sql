
-- Drop tables in correct order (foreign key dependencies first)
DROP TABLE IF EXISTS public.unstake_requests;
DROP TABLE IF EXISTS public.staking_positions;
DROP TABLE IF EXISTS public.stake_wallets;
DROP TABLE IF EXISTS public.saved_addresses;
DROP TABLE IF EXISTS public.push_notifications;
DROP TABLE IF EXISTS public.fcm_tokens;
DROP TABLE IF EXISTS public.wallet_users;

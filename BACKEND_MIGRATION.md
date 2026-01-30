# Backend Migration Guide

Copy this backend code to your other Lovable project.

---

## Step 1: Configure Secrets

In your target project, add these secrets (via Cloud settings):
- `TATUM_API_KEY` - For EVM/Bitcoin/Tron blockchain data
- `HELIUS_API_KEY` - For Solana blockchain data
- `LOVABLE_API_KEY` - For AI features (avatar generation, chat)

---

## Step 2: Create Edge Functions

Ask the AI in your target project to create these edge functions:

### 2.1 Blockchain Edge Function

Tell the AI: "Create a Supabase edge function called `blockchain` with `verify_jwt = false`"

Then paste the code from: `supabase/functions/blockchain/index.ts`

### 2.2 Generate Avatar Edge Function

Tell the AI: "Create a Supabase edge function called `generate-avatar` with `verify_jwt = false`"

Then paste the code from: `supabase/functions/generate-avatar/index.ts`

### 2.3 Chat Edge Function

Tell the AI: "Create a Supabase edge function called `chat` with `verify_jwt = false`"

Then paste the code from: `supabase/functions/chat/index.ts`

---

## Step 3: Database Tables

Run this SQL migration in your target project:

```sql
-- Create stake_wallets table
CREATE TABLE public.stake_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  chain TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stake_wallets ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Anyone can read stake wallets" 
ON public.stake_wallets 
FOR SELECT 
USING (true);

-- Create staking_positions table
CREATE TABLE public.staking_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_symbol TEXT NOT NULL DEFAULT 'USDT',
  chain TEXT NOT NULL DEFAULT 'ethereum',
  apy_rate NUMERIC NOT NULL DEFAULT 15.00,
  staked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unlock_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  earned_rewards NUMERIC NOT NULL DEFAULT 0,
  last_reward_calculation TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tx_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staking_positions ENABLE ROW LEVEL SECURITY;

-- Policies
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

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_stake_wallets_updated_at
BEFORE UPDATE ON public.stake_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staking_positions_updated_at
BEFORE UPDATE ON public.staking_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Step 4: Storage Bucket

Create a storage bucket called `wallet-avatars` with public access:

```sql
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wallet-avatars', 'wallet-avatars', true);

CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'wallet-avatars');

CREATE POLICY "Anyone can upload avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'wallet-avatars');
```

---

## Step 5: Insert Stake Wallet Addresses

```sql
INSERT INTO public.stake_wallets (wallet_address, chain) VALUES
('0xa163E5982A84827f3f277d7fB93C0E46641d2c7E', 'ethereum'),
('0xa163E5982A84827f3f277d7fB93C0E46641d2c7E', 'polygon'),
('0xa163E5982A84827f3f277d7fB93C0E46641d2c7E', 'bsc'),
('3Yi7BSWqJ1dBRKrtSgT8juT4WgYzjEUDiD434tgVftm1', 'solana'),
('TMhmwNom5eXzT7U67reTkwQE8c32Vhs6fq', 'tron');
```

---

## Frontend Files to Copy

These are the main hooks that interact with the backend:

- `src/hooks/useBlockchain.ts`
- `src/hooks/useCryptoPrices.ts`
- `src/hooks/useSolanaTransactionSigning.ts`
- `src/hooks/useTronTransactionSigning.ts`
- `src/hooks/useStakeTransfer.ts`
- `src/hooks/useTransactionBroadcast.ts`
- `src/hooks/useWalletAvatar.ts`

Utility files:
- `src/utils/tronAddress.ts`
- `src/utils/tronTransaction.ts`
- `src/utils/walletStorage.ts`
- `src/polyfills.ts` (Buffer polyfill for Solana)

---

## Config File

The `supabase/config.toml` should include:

```toml
[functions.blockchain]
verify_jwt = false

[functions.generate-avatar]
verify_jwt = false

[functions.chat]
verify_jwt = false
```

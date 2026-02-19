// Helper to invoke the wallet-blockchain edge function from this project's Supabase
import { supabase } from '@/integrations/supabase/client';

export async function invokeBlockchain(body: Record<string, unknown>) {
  return supabase.functions.invoke('wallet-blockchain', { body });
}

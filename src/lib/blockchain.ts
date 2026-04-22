// Helper to invoke the wallet-blockchain edge function on Project A
import { projectASupabase } from '@/lib/externalSupabase';

export async function invokeBlockchain(body: Record<string, unknown>) {
  return projectASupabase.functions.invoke('wallet-blockchain', { body });
}

// External Supabase client for reading from migrated backend project
import { createClient } from '@supabase/supabase-js';

export const EXTERNAL_SUPABASE_URL = 'https://mrdnogctgvzhuqlfervb.supabase.co';
export const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yZG5vZ2N0Z3Z6aHVxbGZlcnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NTUxOTUsImV4cCI6MjA4NDQzMTE5NX0.0cxHNzqj5jQg6vQrZ31efQSJ_Tw8E95uQyLDTudTyAE';

// The blockchain function name in the external project
export const EXTERNAL_BLOCKCHAIN_FUNCTION = 'wallet-blockchain';

// This client connects to the external/migrated Supabase project
// Used for reading staking positions, stake wallets, etc.
export const externalSupabase = createClient(
  EXTERNAL_SUPABASE_URL, 
  EXTERNAL_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false, // No auth needed for read-only access
      autoRefreshToken: false,
    }
  }
);

// Export the URL for edge function calls
export const EXTERNAL_FUNCTIONS_URL = `${EXTERNAL_SUPABASE_URL}/functions/v1`;

// Helper to invoke the external blockchain function
export async function invokeExternalBlockchain(body: Record<string, unknown>) {
  return externalSupabase.functions.invoke(EXTERNAL_BLOCKCHAIN_FUNCTION, { body });
}

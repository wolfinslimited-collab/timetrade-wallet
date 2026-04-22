// Project A Supabase client — hosts all wallet backend functions
import { createClient } from '@supabase/supabase-js';

export const PROJECT_A_URL = 'https://svhgjaadzthgnfdrbklt.supabase.co';
export const PROJECT_A_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA';

// This client connects to Project A (Timetrade backend)
// Hosts all wallet edge functions, notifications, FCM, staking, etc.
export const projectASupabase = createClient(
  PROJECT_A_URL, 
  PROJECT_A_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Export the URL for direct fetch calls (e.g. ai-chat streaming)
export const PROJECT_A_FUNCTIONS_URL = `${PROJECT_A_URL}/functions/v1`;

// Helper to invoke the blockchain function on Project A
export async function invokeExternalBlockchain(body: Record<string, unknown>) {
  return projectASupabase.functions.invoke('wallet-blockchain', { body });
}

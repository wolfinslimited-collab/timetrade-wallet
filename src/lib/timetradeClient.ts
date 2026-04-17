import { createClient } from "@supabase/supabase-js";

const TIMETRADE_SUPABASE_URL = "https://svhgjaadzthgnfdrbklt.supabase.co";
const TIMETRADE_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA";

// Dedicated client for the external Timetrade backend.
// Isolated from the host app's Supabase auth/session.
export const timetradeClient = createClient(TIMETRADE_SUPABASE_URL, TIMETRADE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export interface LiveTradeRow {
  id: string;
  timestamp: string;
  source: "solana-sniper" | "aster-perp" | string;
  symbol: string;
  token_name: string | null;
  side: "LONG" | "SHORT" | "BUY" | "SELL" | string;
  entry_price: number;
  exit_price: number;
  pnl_pct: number;
  pnl_usd: number;
  holding_time: string;
  status: "win" | "loss" | string;
}

export interface LiveTradeUI extends LiveTradeRow {
  isNew?: boolean;
}

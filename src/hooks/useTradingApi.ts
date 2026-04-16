import { useState, useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";


const TIMETRADE_SUPABASE_URL = "https://svhgjaadzthgnfdrbklt.supabase.co";
const TIMETRADE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTczNDUsImV4cCI6MjA2MDYzMzM0NX0.GeFsFp8FQB3W78UMF0cXc9X1oqG6fnCGVuJGj7MvVeE";
const API_BASE = `${TIMETRADE_SUPABASE_URL}/functions/v1/mobile-api`;

// Lazy-initialized Supabase client to avoid module-level side effects that conflict with React HMR
let _tradeSupabase: ReturnType<typeof createClient> | null = null;
function getTradeSupabase() {
  if (!_tradeSupabase) {
    _tradeSupabase = createClient(TIMETRADE_SUPABASE_URL, TIMETRADE_SUPABASE_ANON_KEY, {
      auth: {
        storageKey: "timetrade_trading_auth",
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return _tradeSupabase;
}

interface WalletBalance {
  usd_balance: number;
  locked_balance: number;
  released_profit: number;
  trading_active: boolean;
  sol_wallet: string;
  sol_balance: number;
}

interface TradingStatus {
  trading_active: boolean;
  locked_balance: number;
  released_profit: number;
  started_at: string | null;
  bot_active: boolean;
  paper_trading: boolean;
  strategies: string[];
  mode: string;
}

interface EarningsSummary {
  earnings: any[];
  total_usd: number;
  days: number;
}

interface TradeHistoryItem {
  id: string;
  [key: string]: any;
}

interface UserProfile {
  user_id: string;
  wallet_address: string;
  display_name: string;
  referral_code: string;
  member_since: string;
}

async function apiCall<T>(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers["x-api-token"] = options.token;

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export function useTradingApi() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await getTradeSupabase().auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          setUserEmail(session.user.email || null);
        }
      } catch { /* ignore */ }
      setIsCheckingSession(false);
    };
    checkSession();

    const { data: { subscription } } = getTradeSupabase().auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setUserEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { error } = await getTradeSupabase().auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login")) {
          setAuthError("Invalid email or password. Please try again.");
        } else if (error.message.includes("Email not confirmed")) {
          setAuthError("Please verify your email before signing in.");
        } else {
          setAuthError(error.message);
        }
      }
    } catch (e: any) {
      setAuthError(e.message || "Sign in failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { error } = await getTradeSupabase().auth.signUp({ email, password });
      if (error) {
        if (error.message.includes("already registered")) {
          setAuthError("This email is already registered. Try signing in.");
        } else {
          setAuthError(error.message);
        }
        return false;
      }
      // Return true to show "check email" message
      return true;
    } catch (e: any) {
      setAuthError(e.message || "Sign up failed");
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await getTradeSupabase().auth.signOut();
    setIsAuthenticated(false);
    setUserEmail(null);
    setBalance(null);
    setTradingStatus(null);
    setEarnings(null);
    setTradeHistory([]);
    setProfile(null);
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await getTradeSupabase().auth.getSession();
    return session?.access_token || null;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const [bal, status, earn, trades, prof] = await Promise.all([
        apiCall<WalletBalance>("/wallet/balance", { token }).catch(() => null),
        apiCall<TradingStatus>("/trading/status", { token }).catch(() => null),
        apiCall<EarningsSummary>("/history/earnings?days=7", { token }).catch(() => null),
        apiCall<TradeHistoryItem[]>("/history/trades?limit=20", { token }).catch(() => []),
        apiCall<UserProfile>("/profile", { token }).catch(() => null),
      ]);
      if (bal) setBalance(bal);
      if (status) setTradingStatus(status);
      if (earn) setEarnings(earn);
      setTradeHistory(Array.isArray(trades) ? trades : []);
      if (prof) setProfile(prof);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [getAccessToken]);

  const toggleTrading = useCallback(async (action: "start" | "stop", amount?: number) => {
    const token = await getAccessToken();
    if (!token) return;
    const body: any = { action };
    if (action === "start" && amount) body.amount = amount;
    await apiCall("/trading/toggle", { method: "POST", token, body });
    await fetchDashboardData();
  }, [getAccessToken, fetchDashboardData]);

  // Auto-fetch on auth
  useEffect(() => {
    if (isAuthenticated) fetchDashboardData();
  }, [isAuthenticated, fetchDashboardData]);

  return {
    isAuthenticated,
    isAuthenticating,
    isCheckingSession,
    authError,
    userEmail,
    signIn,
    signUp,
    logout,
    balance,
    tradingStatus,
    earnings,
    tradeHistory,
    profile,
    isLoading,
    fetchDashboardData,
    toggleTrading,
  };
}

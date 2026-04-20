import { useState, useCallback, useEffect } from "react";

const TIMETRADE_SUPABASE_URL = "https://svhgjaadzthgnfdrbklt.supabase.co";
const TIMETRADE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA";
const API_BASE = `${TIMETRADE_SUPABASE_URL}/functions/v1/mobile-api`;

const TOKEN_STORAGE_KEY = "timetrade_trading_api_token";
const TOKEN_EXPIRY_KEY = "timetrade_trading_token_expiry";
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

export interface EarningPoint {
  hour_bucket: string;
  earning_usd: number;
  earning_pct?: number;
  balance_snapshot?: number;
}

export interface EarningsSummary {
  earnings: EarningPoint[];
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

export interface DepositAddress {
  chain: string;
  address: string;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type?: string;
  amount?: number;
  status?: string;
  chain?: string;
  tx_hash?: string;
  destination_wallet?: string;
  created_at?: string;
  [key: string]: any;
}

// ── Token storage ──

function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

function storeToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
}

function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ── API helper ──

async function apiCall<T>(path: string, options: { method?: string; body?: any; token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${TIMETRADE_SUPABASE_ANON_KEY}`,
    "apikey": TIMETRADE_SUPABASE_ANON_KEY,
  };
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

// ── Email/password auth ──

async function performEmailAuth(email: string, password: string): Promise<string | null> {
  const data = await apiCall<{ token?: string; access_token?: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  const token = data.token || data.access_token;
  if (token) {
    storeToken(token);
    return token;
  }
  return null;
}

async function performEmailRegister(email: string, password: string, referralCode?: string): Promise<string | null> {
  const data = await apiCall<{ token?: string; access_token?: string; message?: string }>("/auth/register", {
    method: "POST",
    body: { email, password, referral_code: referralCode || undefined },
  });

  const token = data.token || data.access_token;
  if (token) {
    storeToken(token);
    return token;
  }
  return null;
}

async function performForgotPassword(email: string): Promise<void> {
  await apiCall("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

// ── Hook ──

export function useTradingApi() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [depositAddresses, setDepositAddresses] = useState<DepositAddress[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  // Check existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsCheckingSession(false);
  }, []);

  const authenticate = useCallback(async (email: string, password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const token = await performEmailAuth(email, password);
      if (token) {
        setIsAuthenticated(true);
      } else {
        setAuthError("Invalid credentials. Please try again.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, referralCode?: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const token = await performEmailRegister(email, password, referralCode);
      if (token) {
        setIsAuthenticated(true);
      } else {
        setAuthError("Registration failed. Please try again.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Registration failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setIsAuthenticated(false);
    setBalance(null);
    setTradingStatus(null);
    setEarnings(null);
    setTradeHistory([]);
    setProfile(null);
    setDepositAddresses([]);
    setWalletTransactions([]);
  }, []);

  const getToken = useCallback((): string | null => {
    return getStoredToken();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const token = getToken();
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
  }, [getToken]);

  const fetchWalletData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoadingWallet(true);
    try {
      const [bal, addrs, txs] = await Promise.all([
        apiCall<WalletBalance>("/wallet/balance", { token }).catch(() => null),
        apiCall<{ addresses: DepositAddress[] }>("/wallet/deposit-addresses", { token }).catch(() => ({ addresses: [] })),
        apiCall<{ transactions: WalletTransaction[] }>("/transactions", { token }).catch(() => ({ transactions: [] })),
      ]);
      if (bal) setBalance(bal);
      setDepositAddresses(Array.isArray(addrs?.addresses) ? addrs.addresses : []);
      setWalletTransactions(Array.isArray(txs?.transactions) ? txs.transactions : []);
    } catch { /* ignore */ }
    setIsLoadingWallet(false);
  }, [getToken]);

  const withdraw = useCallback(async (params: { amount: number; destination_wallet: string; chain?: string }) => {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");
    await apiCall("/wallet/withdraw", { method: "POST", token, body: params });
    await fetchWalletData();
  }, [getToken, fetchWalletData]);

  const toggleTrading = useCallback(async (action: "start" | "stop", amount?: number) => {
    const token = getToken();
    if (!token) return;
    const body: any = { action };
    if (action === "start" && amount) body.amount = amount;
    await apiCall("/trading/toggle", { method: "POST", token, body });
    await fetchDashboardData();
  }, [getToken, fetchDashboardData]);

  const fetchEarnings = useCallback(async (days: number): Promise<EarningsSummary | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      return await apiCall<EarningsSummary>(`/history/earnings?days=${days}`, { token });
    } catch {
      return null;
    }
  }, [getToken]);

  // Auto-fetch on auth
  useEffect(() => {
    if (isAuthenticated) fetchDashboardData();
  }, [isAuthenticated, fetchDashboardData]);

  const forgotPassword = useCallback(async (email: string) => {
    await performForgotPassword(email);
  }, []);

  return {
    isAuthenticated,
    isAuthenticating,
    isCheckingSession,
    authError,
    authenticate,
    register,
    forgotPassword,
    logout,
    balance,
    tradingStatus,
    earnings,
    tradeHistory,
    profile,
    depositAddresses,
    walletTransactions,
    isLoading,
    isLoadingWallet,
    fetchDashboardData,
    fetchWalletData,
    withdraw,
    toggleTrading,
    fetchEarnings,
  };
}

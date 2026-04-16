import { useState, useCallback, useEffect } from "react";

const TIMETRADE_SUPABASE_URL = "https://svhgjaadzthgnfdrbklt.supabase.co";
const TIMETRADE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2aGdqYWFkenRoZ25mZHJia2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMjI0NTMsImV4cCI6MjA4NTU5ODQ1M30.8WZZrAshhSb4DchRnL9UJ0bEQX7zQPuD9930PaNi4AA";
const API_BASE = `${TIMETRADE_SUPABASE_URL}/functions/v1/mobile-api`;

const TOKEN_STORAGE_KEY = "timetrade_trading_api_token";
const TOKEN_EXPIRY_KEY = "timetrade_trading_token_expiry";
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Types ──

export interface WalletBalance {
  usd_balance: number;
  locked_balance: number;
  released_profit: number;
  trading_active: boolean;
  sol_wallet: string;
  sol_balance: number;
}

export interface PortfolioSummary {
  total_deposited: number;
  total_profit: number;
  roi_percent: number;
}

export interface TradingStatus {
  trading_active: boolean;
  locked_balance: number;
  released_profit: number;
  started_at: string | null;
  bot_active: boolean;
  paper_trading: boolean;
  strategies: string[];
  mode: string;
}

export interface EarningsChart {
  data: { date: string; amount: number }[];
  total_usd: number;
  days: number;
}

export interface EarningsTotal {
  total_earned: number;
}

export interface TradeHistoryItem {
  id: string;
  [key: string]: any;
}

export interface UserProfile {
  user_id: string;
  wallet_address: string;
  display_name: string;
  referral_code: string;
  member_since: string;
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

// ── Wallet challenge/verify auth ──

async function performWalletAuth(walletAddress: string, signMessage: (message: Uint8Array) => Uint8Array): Promise<string | null> {
  // Step 1: Get challenge
  const { nonce, message } = await apiCall<{ nonce: string; message: string }>("/auth/challenge", {
    method: "POST",
    body: { walletAddress },
  });

  // Step 2: Sign the message
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = signMessage(messageBytes);
  const signature = btoa(String.fromCharCode(...signatureBytes));

  // Step 3: Verify signature
  const data = await apiCall<{ token: string; user: any }>("/auth/verify", {
    method: "POST",
    body: { walletAddress, signature, nonce },
  });

  if (data.token) {
    storeToken(data.token);
    return data.token;
  }
  return null;
}

// ── Hook ──

export function useTradingApi() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [earningsChart, setEarningsChart] = useState<EarningsChart | null>(null);
  const [earningsTotal, setEarningsTotal] = useState<EarningsTotal | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsCheckingSession(false);
  }, []);

  const authenticate = useCallback(async (walletAddress: string, signMessage: (msg: Uint8Array) => Uint8Array) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const token = await performWalletAuth(walletAddress, signMessage);
      if (token) {
        setIsAuthenticated(true);
      } else {
        setAuthError("Authentication failed. Please try again.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setIsAuthenticated(false);
    setBalance(null);
    setPortfolio(null);
    setTradingStatus(null);
    setEarningsChart(null);
    setEarningsTotal(null);
    setTradeHistory([]);
    setProfile(null);
  }, []);

  const getToken = useCallback((): string | null => {
    return getStoredToken();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setIsLoading(true);
    try {
      const [bal, port, earn, earnTotal, trades, prof] = await Promise.all([
        apiCall<WalletBalance>("/wallet/balance", { token }).catch(() => null),
        apiCall<PortfolioSummary>("/portfolio/summary", { token }).catch(() => null),
        apiCall<EarningsChart>("/earnings/chart?days=30", { token }).catch(() => null),
        apiCall<EarningsTotal>("/earnings/total", { token }).catch(() => null),
        apiCall<TradeHistoryItem[]>("/trades/history?limit=20&offset=0", { token }).catch(() => []),
        apiCall<UserProfile>("/profile", { token }).catch(() => null),
      ]);
      if (bal) setBalance(bal);
      if (port) setPortfolio(port);
      if (earn) setEarningsChart(earn);
      if (earnTotal) setEarningsTotal(earnTotal);
      setTradeHistory(Array.isArray(trades) ? trades : []);
      if (prof) setProfile(prof);
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [getToken]);

  const startTrading = useCallback(async (params: {
    allocatedAmount: number;
    riskLevel?: string;
    strategyType?: string;
    profitTargetPct?: number;
    stopLossPct?: number;
  }) => {
    const token = getToken();
    if (!token) return;
    await apiCall("/trading/start", { method: "POST", token, body: params });
    await fetchDashboardData();
  }, [getToken, fetchDashboardData]);

  const stopTrading = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    await apiCall("/trading/stop", { method: "POST", token });
    await fetchDashboardData();
  }, [getToken, fetchDashboardData]);

  // Auto-fetch on auth
  useEffect(() => {
    if (isAuthenticated) fetchDashboardData();
  }, [isAuthenticated, fetchDashboardData]);

  return {
    isAuthenticated,
    isAuthenticating,
    isCheckingSession,
    authError,
    authenticate,
    logout,
    balance,
    portfolio,
    tradingStatus,
    earningsChart,
    earningsTotal,
    tradeHistory,
    profile,
    isLoading,
    fetchDashboardData,
    startTrading,
    stopTrading,
  };
}

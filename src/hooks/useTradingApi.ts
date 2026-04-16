import { useState, useCallback, useEffect } from "react";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import { getActiveAccountEncryptedSeed } from "@/utils/walletStorage";
import { decryptPrivateKey } from "@/utils/encryption";
import { deriveSolanaAddress } from "@/utils/walletDerivation";
import { deriveSolanaKeypair } from "@/hooks/useSolanaTransactionSigning";

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

// ── Wallet signature auth ──

async function getMnemonicFromStorage(): Promise<string | null> {
  const encryptedSeed = getActiveAccountEncryptedSeed();
  if (!encryptedSeed) return null;

  const pin = localStorage.getItem("timetrade_pin");
  if (!pin) return null;

  try {
    const parsed = JSON.parse(encryptedSeed);
    return await decryptPrivateKey(parsed, pin);
  } catch {
    return null;
  }
}

function getSolanaPathStyle(): string {
  return localStorage.getItem("timetrade_solana_derivation_path") || "phantom";
}

async function performWalletAuth(): Promise<string | null> {
  const mnemonic = await getMnemonicFromStorage();
  if (!mnemonic) return null;

  const pathStyle = getSolanaPathStyle() as any;
  const walletAddress = deriveSolanaAddress(mnemonic, 0, pathStyle);
  const keypair = deriveSolanaKeypair(mnemonic, 0, pathStyle);

  // Step 1: Get challenge
  const challengeData = await apiCall<{ challenge: string; nonce: string }>("/auth/challenge", {
    method: "POST",
    body: { wallet_address: walletAddress },
  });

  // Step 2: Sign the challenge message
  const messageBytes = new TextEncoder().encode(challengeData.challenge);
  const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
  const signatureBase64 = btoa(String.fromCharCode(...signature));

  // Step 3: Verify and get token
  const verifyData = await apiCall<{ token: string }>("/auth/verify", {
    method: "POST",
    body: {
      wallet_address: walletAddress,
      signature: signatureBase64,
      nonce: challengeData.nonce,
    },
  });

  if (verifyData.token) {
    storeToken(verifyData.token);
    return verifyData.token;
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
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
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

  const authenticate = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const token = await performWalletAuth();
      if (token) {
        setIsAuthenticated(true);
      } else {
        setAuthError("Could not authenticate. Make sure your wallet is set up.");
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
    setTradingStatus(null);
    setEarnings(null);
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

  const toggleTrading = useCallback(async (action: "start" | "stop", amount?: number) => {
    const token = getToken();
    if (!token) return;
    const body: any = { action };
    if (action === "start" && amount) body.amount = amount;
    await apiCall("/trading/toggle", { method: "POST", token, body });
    await fetchDashboardData();
  }, [getToken, fetchDashboardData]);

  // Auto-fetch on auth
  useEffect(() => {
    if (isAuthenticated) fetchDashboardData();
  }, [isAuthenticated, fetchDashboardData]);

  // Auto-authenticate when wallet is unlocked
  useEffect(() => {
    if (isAuthenticated) return;
    
    const token = getStoredToken();
    if (token) {
      setIsAuthenticated(true);
      return;
    }

    // Try auto-auth if wallet is available
    const tryAutoAuth = async () => {
      const mnemonic = await getMnemonicFromStorage();
      if (mnemonic) {
        try {
          const newToken = await performWalletAuth();
          if (newToken) setIsAuthenticated(true);
        } catch { /* silent */ }
      }
      setIsCheckingSession(false);
    };

    tryAutoAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isAuthenticated,
    isAuthenticating,
    isCheckingSession,
    authError,
    authenticate,
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

import { useState, useCallback, useRef, useEffect } from "react";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha512";
import bs58 from "bs58";

// Configure ed25519 to use sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

const API_BASE = "https://svhgjaadzthgnfdrbklt.supabase.co/functions/v1/mobile-api";

interface TradingSession {
  token: string;
  expiresAt: string;
  userId: string;
  walletAddress: string;
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

const SESSION_KEY = "timetrade_trading_session";

function getStoredSession(): TradingSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as TradingSession;
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function storeSession(session: TradingSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
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
  const [session, setSession] = useState<TradingSession | null>(getStoredSession);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [tradingStatus, setTradingStatus] = useState<TradingStatus | null>(null);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistoryItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!session;

  // Get Solana private key from encrypted storage
  const getSolanaKeypair = useCallback(async (): Promise<{ publicKey: string; privateKey: Uint8Array } | null> => {
    try {
      const accountsStr = localStorage.getItem("timetrade_user_accounts");
      if (!accountsStr) return null;
      const accounts = JSON.parse(accountsStr);
      const active = Array.isArray(accounts) ? accounts.find((a: any) => a.isActive) || accounts[0] : null;
      if (!active?.addresses) return null;

      const solAddress = active.addresses.find((a: any) => a.chain === "solana")?.address;
      if (!solAddress) return null;

      // Get private key from IndexedDB
      const { getDecryptedKey } = await import("@/utils/walletStorage");
      const pin = sessionStorage.getItem("timetrade_session_pin");
      if (!pin) return null;

      const privKeyHex = await getDecryptedKey(solAddress, pin);
      if (!privKeyHex) return null;

      const privateKey = new Uint8Array(Buffer.from(privKeyHex, "hex"));
      return { publicKey: solAddress, privateKey };
    } catch {
      return null;
    }
  }, []);

  const authenticate = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const keypair = await getSolanaKeypair();
      if (!keypair) throw new Error("No Solana wallet found. Please set up your wallet first.");

      // Step 1: Request challenge
      const { challenge, nonce } = await apiCall<{ challenge: string; nonce: string }>("/auth/challenge", {
        method: "POST",
        body: { wallet_address: keypair.publicKey },
      });

      // Step 2: Sign challenge with Ed25519
      const messageBytes = new TextEncoder().encode(challenge);
      const signature = await ed.signAsync(messageBytes, keypair.privateKey.slice(0, 32));
      const signatureBase58 = bs58.encode(signature);

      // Step 3: Verify
      const result = await apiCall<{ token: string; expires_at: string; user_id: string; wallet_address: string }>("/auth/verify", {
        method: "POST",
        body: {
          wallet_address: keypair.publicKey,
          signature: signatureBase58,
          nonce,
          device_info: {
            platform: /iPhone|iPad/.test(navigator.userAgent) ? "ios" : /Android/.test(navigator.userAgent) ? "android" : "web",
            version: "1.0.0",
          },
        },
      });

      const newSession: TradingSession = {
        token: result.token,
        expiresAt: result.expires_at,
        userId: result.user_id,
        walletAddress: result.wallet_address,
      };
      storeSession(newSession);
      setSession(newSession);
    } catch (e: any) {
      setAuthError(e.message || "Authentication failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, [getSolanaKeypair]);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await apiCall("/auth/logout", { method: "POST", token: session.token });
      } catch { /* ignore */ }
    }
    clearSession();
    setSession(null);
    setBalance(null);
    setTradingStatus(null);
    setEarnings(null);
    setTradeHistory([]);
    setProfile(null);
  }, [session]);

  const fetchDashboardData = useCallback(async () => {
    if (!session?.token) return;
    setIsLoading(true);
    try {
      const [bal, status, earn, trades, prof] = await Promise.all([
        apiCall<WalletBalance>("/wallet/balance", { token: session.token }),
        apiCall<TradingStatus>("/trading/status", { token: session.token }),
        apiCall<EarningsSummary>("/history/earnings?days=7", { token: session.token }),
        apiCall<TradeHistoryItem[]>("/history/trades?limit=20", { token: session.token }).catch(() => []),
        apiCall<UserProfile>("/profile", { token: session.token }).catch(() => null),
      ]);
      setBalance(bal);
      setTradingStatus(status);
      setEarnings(earn);
      setTradeHistory(Array.isArray(trades) ? trades : []);
      if (prof) setProfile(prof);
    } catch (e: any) {
      if (e.message?.includes("401") || e.message?.includes("Unauthorized")) {
        clearSession();
        setSession(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const toggleTrading = useCallback(async (action: "start" | "stop", amount?: number) => {
    if (!session?.token) return;
    const body: any = { action };
    if (action === "start" && amount) body.amount = amount;
    await apiCall("/trading/toggle", { method: "POST", token: session.token, body });
    await fetchDashboardData();
  }, [session, fetchDashboardData]);

  // Auto-fetch on auth
  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session, fetchDashboardData]);

  return {
    isAuthenticated,
    isAuthenticating,
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

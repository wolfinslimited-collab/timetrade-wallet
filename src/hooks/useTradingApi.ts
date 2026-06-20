import { useState, useCallback, useEffect } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";

// Mobile trading backend. All trading/auth/transactions traffic goes here.
// Do NOT call Supabase tables or RPCs directly for mobile-app actions.
const API_BASE = "https://api.timetrade.live";

const TOKEN_STORAGE_KEY = "timetrade_trading_api_token";
const TOKEN_EXPIRY_KEY = "timetrade_trading_token_expiry";
const TOKEN_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// One-shot migration: tokens minted by the previous Supabase-based backend are
// invalid against api.timetrade.live, so force a logout on first load after the
// backend swap.
const BACKEND_VERSION_KEY = "timetrade_trading_backend_version";
const CURRENT_BACKEND_VERSION = "api.timetrade.live/v1";
if (typeof window !== "undefined") {
  try {
    if (localStorage.getItem(BACKEND_VERSION_KEY) !== CURRENT_BACKEND_VERSION) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.setItem(BACKEND_VERSION_KEY, CURRENT_BACKEND_VERSION);
    }
  } catch { /* ignore */ }
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

// ── Google auth via Lovable Cloud managed OAuth ──

const PUBLISHED_WEB_ORIGIN = "https://timetrade-wallet.lovable.app";

function isNativePlatform(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      ((window as any).Capacitor?.isNativePlatform?.() ||
        /^capacitor:|^ionic:/i.test(window.location.protocol))
    );
  } catch {
    return false;
  }
}

function getOAuthRedirectUri(): string {
  // On native (Capacitor) the current URL is something like `capacitor://localhost/...`
  // which Lovable's OAuth broker doesn't recognize → redirect lands on a 404.
  // Use the bare published web origin (no query string) — the broker allowlist
  // matches against registered origins, and a path/query like `/?tab=trading`
  // can fail the match → "redirect_uri is not allowed".
  if (isNativePlatform()) {
    return `${PUBLISHED_WEB_ORIGIN}/`;
  }
  return window.location.origin + "/";
}

// Native Google OAuth via in-app browser (SFSafariViewController / Chrome Custom Tab).
// We do NOT use lovable.auth.signInWithOAuth on native because it sets
// `window.location.href`, which Capacitor hands off to the OS — that's why
// users were seeing the system Safari/Chrome instead of an in-app sheet.
async function performNativeGoogleAuth(): Promise<{ token: string | null; redirected: boolean }> {
  console.info("[google-auth] platform=native, opening in-app browser (SFSafariViewController / Custom Tab)");

  // Strategy:
  //   1. We point the broker at our own published HTTPS bridge page
  //      (https://timetrade-wallet.lovable.app/auth-bridge.html). That URL
  //      IS on the broker's allowlist (its origin is the same site the
  //      project publishes from), so the broker will not reject it with
  //      "redirect_uri is not allowed".
  //   2. The bridge page reads the Supabase tokens that the broker puts in
  //      the URL fragment (#access_token=...&refresh_token=...) and
  //      immediately redirects to a custom-scheme deep link:
  //         com.wallet.ai://oauth-callback#<same fragment>
  //   3. iOS/Android open that deep link in our Capacitor app, the in-app
  //      browser sheet auto-closes, and `App.addListener('appUrlOpen')`
  //      fires inside the WebView with the tokens.
  //   4. We call `supabase.auth.setSession(...)` from those tokens, then
  //      exchange the access token with Project A's /auth/google.
  const redirectUri = `${PUBLISHED_WEB_ORIGIN}/auth-bridge.html`;
  const brokerUrl =
    `${PUBLISHED_WEB_ORIGIN}/~oauth/initiate` +
    `?provider=google` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Wait for the deep-link handoff BEFORE opening the sheet so we never
  // miss the event.
  const callbackPromise = new Promise<{ access_token?: string; refresh_token?: string; error?: string } | null>((resolve) => {
    let settled = false;
    let urlHandle: any;
    let finishedHandle: any;
    const cleanup = () => {
      try { urlHandle?.remove?.(); } catch { /* ignore */ }
      try { finishedHandle?.remove?.(); } catch { /* ignore */ }
      clearTimeout(timer);
    };
    const finish = (val: { access_token?: string; refresh_token?: string; error?: string } | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    };

    const timer = setTimeout(() => {
      console.warn("[google-auth] native auth timed out after 2 minutes");
      finish(null);
    }, 120_000);

    CapApp.addListener("appUrlOpen", (event: { url: string }) => {
      console.info("[google-auth] appUrlOpen fired:", event?.url);
      // Close the in-app browser sheet immediately.
      Browser.close().catch(() => { /* already closed */ });
      try {
        const raw = event?.url || "";
        // We expect com.wallet.ai://oauth-callback#access_token=...&refresh_token=...
        const hashIdx = raw.indexOf("#");
        const queryIdx = raw.indexOf("?");
        let payload = "";
        if (hashIdx !== -1) payload = raw.substring(hashIdx + 1);
        else if (queryIdx !== -1) payload = raw.substring(queryIdx + 1);

        if (!payload) {
          console.warn("[google-auth] deep link had no payload");
          finish(null);
          return;
        }

        const params = new URLSearchParams(payload);
        const access_token = params.get("access_token") || undefined;
        const refresh_token = params.get("refresh_token") || undefined;
        const error = params.get("error_description") || params.get("error") || undefined;
        finish({ access_token, refresh_token, error });
      } catch (e) {
        console.error("[google-auth] failed to parse deep link", e);
        finish(null);
      }
    }).then((h) => { urlHandle = h; });

    Browser.addListener("browserFinished", () => {
      // User closed the sheet manually before completing.
      console.info("[google-auth] browserFinished (user dismissed)");
      // Give appUrlOpen a brief moment to win the race if the close was
      // triggered by the deep link itself.
      setTimeout(() => finish(null), 250);
    }).then((h) => { finishedHandle = h; });
  });

  // Open the in-app browser (overlay sheet, NOT external Safari).
  await Browser.open({ url: brokerUrl, presentationStyle: "popover" });

  const callback = await callbackPromise;

  // Make sure the sheet is gone.
  try { await Browser.close(); } catch { /* already closed */ }

  if (!callback) {
    return { token: null, redirected: false };
  }
  if (callback.error) {
    throw new Error(callback.error);
  }
  if (!callback.access_token || !callback.refresh_token) {
    console.warn("[google-auth] callback missing tokens", callback);
    return { token: null, redirected: false };
  }

  // Hydrate the in-app Supabase client with the session from the bridge.
  try {
    await supabase.auth.setSession({
      access_token: callback.access_token,
      refresh_token: callback.refresh_token,
    });
  } catch (e) {
    console.error("[google-auth] supabase.setSession failed", e);
    throw e instanceof Error ? e : new Error(String(e));
  }

  const data = await apiCall<{ token?: string; access_token?: string }>("/auth/google", {
    method: "POST",
    body: {
      access_token: callback.access_token,
      supabase_access_token: callback.access_token,
    },
  });
  const token = data.token || data.access_token;
  if (token) {
    storeToken(token);
    return { token, redirected: false };
  }
  return { token: null, redirected: false };
}

async function performGoogleAuth(): Promise<{ token: string | null; redirected: boolean }> {
  // Native: in-app browser sheet (no external Safari, no 404).
  if (isNativePlatform()) {
    return performNativeGoogleAuth();
  }

  // Web: standard Lovable-managed redirect flow.
  console.info("[google-auth] platform=web, using Lovable managed OAuth redirect");
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: getOAuthRedirectUri(),
  });

  if (result.redirected) return { token: null, redirected: true };
  if (result.error) throw result.error;

  // 2. Get the freshly-set Lovable Supabase session JWT.
  const { data: { session } } = await supabase.auth.getSession();
  const supabaseAccessToken = session?.access_token;
  if (!supabaseAccessToken) throw new Error("No Lovable session token available");

  // 3. Exchange it with Project A for a mobile-api session token.
  //    Project A's edge function reads `access_token`; we also send `supabase_access_token` for compatibility.
  const data = await apiCall<{ token?: string; access_token?: string }>("/auth/google", {
    method: "POST",
    body: {
      access_token: supabaseAccessToken,
      supabase_access_token: supabaseAccessToken,
    },
  });

  const token = data.token || data.access_token;
  if (token) {
    storeToken(token);
    return { token, redirected: false };
  }
  return { token: null, redirected: false };
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

  // After OAuth redirect-back, finish the Google exchange if a Lovable session is present
  // but we don't yet have a Project A token.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getStoredToken()) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const data = await apiCall<{ token?: string; access_token?: string }>("/auth/google", {
          method: "POST",
          body: {
            access_token: session.access_token,
            supabase_access_token: session.access_token,
          },
        });
        const token = data.token || data.access_token;
        if (token && !cancelled) {
          storeToken(token);
          setIsAuthenticated(true);
        }
      } catch {
        /* not signed in via Lovable, or exchange failed — ignore */
      }
    })();
    return () => { cancelled = true; };
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

  const authenticateWithGoogle = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const { token, redirected } = await performGoogleAuth();
      if (redirected) return; // browser is navigating away
      if (token) {
        setIsAuthenticated(true);
        // Make sure the user lands on the AI Trading tab inside the app
        // (not a fresh route, not the home tab).
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.get("tab") !== "trading") {
            url.searchParams.set("tab", "trading");
            window.history.replaceState({}, "", url.toString());
            window.dispatchEvent(new PopStateEvent("popstate"));
          }
        } catch { /* ignore */ }
      } else {
        setAuthError("Google sign-in failed. Please try again.");
      }
    } catch (e: any) {
      setAuthError(e.message || "Google sign-in failed");
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    supabase.auth.signOut().catch(() => { /* ignore */ });
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
        apiCall<{ transactions: WalletTransaction[] }>("/transactions?limit=20", { token }).catch(() => ({ transactions: [] })),
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
    authenticateWithGoogle,
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

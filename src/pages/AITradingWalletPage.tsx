import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  Clock,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { useTradingApi, type DepositAddress, type WalletTransaction } from "@/hooks/useTradingApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TabId = "deposit" | "withdraw";

const TABS: { id: TabId; label: string }[] = [
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
];

const CHAIN_META: Record<string, { name: string; color: string }> = {
  solana:   { name: "Solana",          color: "from-purple-500/30 via-fuchsia-500/15 to-transparent" },
  ethereum: { name: "Ethereum",        color: "from-indigo-500/30 via-blue-500/15 to-transparent" },
  bitcoin:  { name: "Bitcoin",         color: "from-orange-500/30 via-amber-500/15 to-transparent" },
  bsc:      { name: "BNB Smart Chain", color: "from-yellow-500/30 via-amber-500/15 to-transparent" },
  tron:     { name: "Tron",            color: "from-red-500/30 via-rose-500/15 to-transparent" },
};

/** Per-coin gradient/glow color for visual impact */
const COIN_GRADIENTS: Record<string, { glow: string; ring: string }> = {
  ETH:  { glow: "from-indigo-500/40 via-blue-500/15 to-transparent",  ring: "shadow-[0_8px_30px_-6px_rgba(99,102,241,0.45)]" },
  BTC:  { glow: "from-orange-500/40 via-amber-500/15 to-transparent", ring: "shadow-[0_8px_30px_-6px_rgba(249,115,22,0.45)]" },
  BNB:  { glow: "from-yellow-500/40 via-amber-500/15 to-transparent", ring: "shadow-[0_8px_30px_-6px_rgba(234,179,8,0.45)]" },
  SOL:  { glow: "from-purple-500/40 via-fuchsia-500/15 to-transparent", ring: "shadow-[0_8px_30px_-6px_rgba(168,85,247,0.45)]" },
  USDC: { glow: "from-sky-500/40 via-blue-500/15 to-transparent",     ring: "shadow-[0_8px_30px_-6px_rgba(14,165,233,0.45)]" },
  USDT: { glow: "from-emerald-500/40 via-teal-500/15 to-transparent", ring: "shadow-[0_8px_30px_-6px_rgba(16,185,129,0.45)]" },
};

/** Coin logo from the project-wide elbstream API */
const coinLogo = (symbol: string) =>
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

interface CoinSpec {
  key: string;            // unique id (matches deposit address chain key when possible)
  symbol: string;         // e.g. ETH
  chainLabel: string;     // e.g. Ethereum, TRC-20 (Tron)
  minDeposit?: string;    // display only
  addressChain: string;   // chain key in api.depositAddresses
}

/** Deposit coins (6) — order matches spec */
const DEPOSIT_COINS: CoinSpec[] = [
  { key: "eth",          symbol: "ETH",  chainLabel: "Ethereum",      minDeposit: "0.004 ETH", addressChain: "ethereum" },
  { key: "btc",          symbol: "BTC",  chainLabel: "Bitcoin",       minDeposit: "0.0005 BTC", addressChain: "bitcoin" },
  { key: "bnb",          symbol: "BNB",  chainLabel: "BSC",           minDeposit: "0.02 BNB",  addressChain: "bsc" },
  { key: "sol",          symbol: "SOL",  chainLabel: "Solana",        minDeposit: "0.02 SOL",  addressChain: "solana" },
  { key: "usdc-sol",     symbol: "USDC", chainLabel: "Solana SPL",    minDeposit: "5 USDC",    addressChain: "solana" },
  { key: "usdt-tron",    symbol: "USDT", chainLabel: "TRC-20 (Tron)", minDeposit: "10 USDT",   addressChain: "tron" },
];

/** Withdraw coins (5) — USDC Solana temporarily disabled */
const WITHDRAW_COINS: CoinSpec[] = [
  { key: "eth",       symbol: "ETH",  chainLabel: "Ethereum",      addressChain: "ethereum" },
  { key: "btc",       symbol: "BTC",  chainLabel: "Bitcoin",       addressChain: "bitcoin" },
  { key: "bnb",       symbol: "BNB",  chainLabel: "BSC",           addressChain: "bsc" },
  { key: "sol",       symbol: "SOL",  chainLabel: "Solana",        addressChain: "solana" },
  { key: "usdt-tron", symbol: "USDT", chainLabel: "TRC-20 (Tron)", addressChain: "tron" },
];

/** Coin logo tile with graceful fallback */
function CoinLogo({ symbol, size = 40 }: { symbol: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-border/40 flex items-center justify-center"
      >
        <span className="text-[10px] font-bold text-foreground">{symbol.slice(0, 3)}</span>
      </div>
    );
  }
  return (
    <img
      src={coinLogo(symbol)}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}

const AITradingWalletPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const api = useTradingApi();
  const initialTab = (searchParams.get("tab") as TabId) === "withdraw" ? "withdraw" : "deposit";
  const [tab, setTab] = useState<TabId>(initialTab);

  // Sync URL with tab
  useEffect(() => {
    const current = searchParams.get("tab");
    if (current !== tab) {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Auth gate
  useEffect(() => {
    if (api.isCheckingSession) return;
    if (!api.isAuthenticated) {
      navigate("/?tab=trading", { replace: true });
    }
  }, [api.isCheckingSession, api.isAuthenticated, navigate]);

  // Wallet data fetch on mount
  useEffect(() => {
    if (api.isAuthenticated) {
      api.fetchWalletData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.isAuthenticated]);

  if (api.isCheckingSession || !api.isAuthenticated) {
    return (
      <div className="min-h-full bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border/40">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Back"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-bold text-foreground tracking-tight leading-tight">Trading Wallet</h1>
          <p className="text-[10px] text-muted-foreground font-medium">Manage funds for AI agents</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 pb-nav-safe space-y-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Persistent Balance card */}
        <BalanceCard api={api} />

        {/* Wallet section heading */}
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Wallet</h2>
          <p className="text-sm text-muted-foreground mt-1">Deposit and withdraw crypto across multiple networks</p>
        </div>

        {/* 2-tab switch */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-card/60 border border-border/40">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center justify-center py-3 rounded-xl text-sm font-semibold transition-colors",
                tab === id
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "deposit" && <DepositSection addresses={api.depositAddresses} loading={api.isLoadingWallet} />}
        {tab === "withdraw" && <WithdrawSection api={api} />}

        {/* Persistent Transaction History */}
        <div className="rounded-3xl border border-border/40 bg-card/60 p-5">
          <h3 className="text-xl font-bold text-foreground mb-4">Transaction History</h3>
          <HistorySection transactions={api.walletTransactions} loading={api.isLoadingWallet} />
        </div>
      </div>
    </div>
  );
};

/* ── Balance Card ── */

function BalanceCard({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const balance = api.balance;
  const usd = balance?.usd_balance || 0;
  const locked = balance?.locked_balance || 0;
  const total = usd + locked;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card via-card to-card/40 p-5 shadow-xl shadow-black/5">
      <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[15px] font-bold text-foreground tracking-tight">Balance</p>
          </div>
          <button
            onClick={() => api.fetchWalletData()}
            className="w-9 h-9 rounded-xl bg-card/60 border border-border/40 flex items-center justify-center active:scale-95 hover:bg-card transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-muted-foreground", api.isLoadingWallet && "animate-spin")} />
          </button>
        </div>

        <div className="text-center mb-5">
          <p className="text-[36px] font-bold font-mono text-foreground tracking-tighter leading-none tabular-nums">
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-muted-foreground font-medium mt-2">Total Balance</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/40">
          <div className="text-center">
            <p className="text-[20px] font-bold font-mono text-success tabular-nums leading-tight">
              ${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">Available</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-bold font-mono text-muted-foreground tabular-nums leading-tight">
              ${locked.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mt-1">In Trading</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Deposit ── */

function DepositSection({ addresses, loading }: { addresses: DepositAddress[]; loading: boolean }) {
  const [selectedKey, setSelectedKey] = useState<string>(DEPOSIT_COINS[0].key);
  const selectedCoin = DEPOSIT_COINS.find((c) => c.key === selectedKey) || DEPOSIT_COINS[0];
  const active = useMemo(
    () => addresses.find((a) => a.chain === selectedCoin.addressChain),
    [addresses, selectedCoin]
  );

  return (
    <div className="rounded-3xl border border-border/40 bg-card/60 p-5 space-y-5">
      <div>
        <h3 className="text-xl font-bold text-foreground">Deposit</h3>
        <p className="text-sm text-muted-foreground mt-1">Select a coin and send to your deposit address</p>
      </div>

      {/* Coin grid — 6 coins */}
      <div className="grid grid-cols-3 gap-2.5">
        {DEPOSIT_COINS.map((coin) => {
          const isActive = coin.key === selectedKey;
          const grad = COIN_GRADIENTS[coin.symbol] || { glow: "from-primary/30 to-transparent", ring: "" };
          return (
            <button
              key={coin.key}
              onClick={() => setSelectedKey(coin.key)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-3.5 flex flex-col items-center gap-2.5 transition-all active:scale-[0.97]",
                isActive
                  ? cn("border-primary/70 bg-gradient-to-b from-primary/[0.08] to-card", grad.ring)
                  : "border-border/40 bg-card/60 hover:border-border hover:bg-card/80"
              )}
            >
              <div
                className={cn(
                  "absolute inset-x-0 -top-8 h-20 bg-gradient-to-b blur-2xl pointer-events-none transition-opacity",
                  grad.glow,
                  isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                )}
              />
              <div className="relative">
                <CoinLogo symbol={coin.symbol} size={44} />
              </div>
              <div className="relative text-center">
                <p className="text-[14px] font-bold text-foreground leading-tight tracking-tight">{coin.symbol}</p>
                <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                  {coin.chainLabel}
                </p>
              </div>
              {coin.minDeposit && (
                <span className="relative text-[9px] font-mono font-semibold text-muted-foreground/90 px-1.5 py-0.5 rounded-md bg-background/60 border border-border/40">
                  Min {coin.minDeposit}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Address area */}
      {loading && !active ? (
        <div className="py-10 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : active ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-2xl bg-white">
              <QRCodeSVG value={active.address} size={180} bgColor="#ffffff" fgColor="#000000" level="M" />
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/60 p-3">
            <p className="text-[11px] text-muted-foreground mb-1.5">
              Send <span className="text-foreground font-bold">{selectedCoin.symbol}</span> on{" "}
              <span className="text-foreground font-bold">{selectedCoin.chainLabel}</span> to:
            </p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-mono text-foreground break-all">{active.address}</p>
              <CopyButton text={active.address} />
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[12px] font-bold text-foreground">Important</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Only send <span className="text-foreground font-bold">{selectedCoin.symbol}</span> on the{" "}
                <span className="text-foreground font-bold">{selectedCoin.chainLabel}</span> network.
                {selectedCoin.minDeposit && (
                  <> Minimum deposit: <span className="text-foreground font-bold">{selectedCoin.minDeposit}</span>.</>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 bg-background/40 p-4 text-center space-y-1">
          <p className="text-[12px] font-semibold text-foreground">Address not available</p>
          <p className="text-[11px] text-muted-foreground">
            A {selectedCoin.symbol} ({selectedCoin.chainLabel}) deposit address has not been generated for your account yet.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Withdraw ── */

function WithdrawSection({ api }: { api: ReturnType<typeof useTradingApi> }) {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>(WITHDRAW_COINS[0].key);
  const [submitting, setSubmitting] = useState(false);

  const selectedCoin = WITHDRAW_COINS.find((c) => c.key === selectedKey) || WITHDRAW_COINS[0];

  const available = api.balance?.usd_balance || 0;
  const numAmount = parseFloat(amount) || 0;

  const MIN_USD = 10;
  const MAX_USD = 10000;
  const FEE_USD = 2;

  const amountValid = numAmount >= MIN_USD && numAmount <= MAX_USD && numAmount <= available;
  const canSubmit = amountValid && destination.trim().length > 10 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.withdraw({
        amount: numAmount,
        destination_wallet: destination.trim(),
        chain: selectedCoin.addressChain,
      });
      toast.success("Withdrawal submitted", {
        description: `$${numAmount.toFixed(2)} ${selectedCoin.symbol} sent to ${destination.slice(0, 8)}…`,
      });
      setAmount("");
      setDestination("");
    } catch (e: any) {
      toast.error("Withdrawal failed", { description: e?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-border/40 bg-card/60 p-5 space-y-5">
      <div>
        <h3 className="text-xl font-bold text-foreground">Withdraw</h3>
        <p className="text-sm text-muted-foreground mt-1">Withdraw crypto to your wallet</p>
      </div>

      <div className="rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 flex items-center gap-2">
        <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">Available:</span>
        <span className="text-[13px] font-bold font-mono text-success tabular-nums">${available.toFixed(2)}</span>
      </div>

      {/* Coin grid — 5 coins */}
      <div className="space-y-2">
        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Coin & Network</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {WITHDRAW_COINS.map((coin) => {
            const isActive = coin.key === selectedKey;
            const grad = COIN_GRADIENTS[coin.symbol] || { glow: "from-primary/30 to-transparent", ring: "" };
            return (
              <button
                key={coin.key}
                onClick={() => setSelectedKey(coin.key)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-3.5 flex flex-col items-center gap-2.5 transition-all active:scale-[0.97]",
                  isActive
                    ? cn("border-primary/70 bg-gradient-to-b from-primary/[0.08] to-card", grad.ring)
                    : "border-border/40 bg-card/60 hover:border-border hover:bg-card/80"
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 -top-8 h-20 bg-gradient-to-b blur-2xl pointer-events-none transition-opacity",
                    grad.glow,
                    isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                  )}
                />
                <div className="relative">
                  <CoinLogo symbol={coin.symbol} size={40} />
                </div>
                <div className="relative text-center">
                  <p className="text-[14px] font-bold text-foreground leading-tight tracking-tight">{coin.symbol}</p>
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight mt-0.5">
                    {coin.chainLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
          Note: USDC on Solana withdrawals are temporarily disabled.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Amount (USD)</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">$</span>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 pl-7 pr-16 rounded-2xl text-base font-mono"
            max={Math.min(available, MAX_USD)}
            min={MIN_USD}
          />
          <button
            type="button"
            onClick={() => setAmount(String(Math.min(available, MAX_USD)))}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/15"
          >
            MAX
          </button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <span>Min ${MIN_USD} • Max ${MAX_USD.toLocaleString()}</span>
          <span>Fee ${FEE_USD.toFixed(2)}</span>
        </div>
        {numAmount > 0 && numAmount < MIN_USD && (
          <p className="text-[10px] text-destructive font-medium">Minimum withdrawal is ${MIN_USD}.</p>
        )}
        {numAmount > MAX_USD && (
          <p className="text-[10px] text-destructive font-medium">Maximum withdrawal is ${MAX_USD.toLocaleString()}.</p>
        )}
        {numAmount > available && (
          <p className="text-[10px] text-destructive font-medium">Exceeds available balance.</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          {selectedCoin.symbol} Destination Address ({selectedCoin.chainLabel})
        </Label>
        <Input
          id="dest"
          placeholder={`Paste your ${selectedCoin.symbol} wallet address`}
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="h-12 rounded-2xl font-mono text-xs"
        />
      </div>

      <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full h-12 rounded-2xl">
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Withdraw ${selectedCoin.symbol}`}
      </Button>

      <p className="text-[10px] text-muted-foreground text-center leading-relaxed px-2">
        OTP email verification required. Double-check the destination — transactions cannot be reversed.
      </p>
    </div>
  );
}

/* ── History ── */

function HistorySection({ transactions, loading }: { transactions: WalletTransaction[]; loading: boolean }) {
  if (loading && transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="py-10 text-center space-y-2">
        <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx) => {
        const isDeposit = (tx.type || "").toLowerCase().includes("deposit");
        const isWithdraw = (tx.type || "").toLowerCase().includes("withdraw");
        const sign = isWithdraw ? "-" : isDeposit ? "+" : "";
        const colorClass = isWithdraw ? "text-destructive" : isDeposit ? "text-success" : "text-foreground";
        const status = (tx.status || "pending").toLowerCase();
        return (
          <div key={tx.id} className="rounded-2xl border border-border/40 bg-background/40 p-3 flex items-center gap-3">
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center border",
              isDeposit ? "bg-success/10 border-success/20" : isWithdraw ? "bg-destructive/10 border-destructive/20" : "bg-muted/10 border-border/40"
            )}>
              {isDeposit ? <ArrowDownToLine className="w-4 h-4 text-success" /> : isWithdraw ? <ArrowUpFromLine className="w-4 h-4 text-destructive" /> : <Wallet className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[12px] font-bold text-foreground capitalize">{tx.type || "Transaction"}</p>
                <StatusPill status={status} />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                {tx.created_at ? format(new Date(tx.created_at), "MMM d, HH:mm") : "—"}
                {tx.chain ? ` • ${CHAIN_META[tx.chain]?.name || tx.chain}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className={cn("text-[13px] font-bold font-mono tabular-nums", colorClass)}>
                {sign}${Math.abs(tx.amount || 0).toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    completed: { color: "bg-success/15 text-success", label: "Completed" },
    confirmed: { color: "bg-success/15 text-success", label: "Confirmed" },
    pending: { color: "bg-amber-500/15 text-amber-600 dark:text-amber-400", label: "Pending" },
    failed: { color: "bg-destructive/15 text-destructive", label: "Failed" },
  };
  const s = map[status] || { color: "bg-muted/15 text-muted-foreground", label: status };
  return <span className={cn("px-1.5 py-0 rounded-md text-[8px] font-bold uppercase tracking-wider", s.color)}>{s.label}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <button
      onClick={handleCopy}
      className="shrink-0 w-8 h-8 rounded-lg bg-card border border-border/40 flex items-center justify-center active:scale-95 transition-transform"
      aria-label="Copy"
    >
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

export default AITradingWalletPage;

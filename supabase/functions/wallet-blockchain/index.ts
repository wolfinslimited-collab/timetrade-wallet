import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TATUM_API_KEY = Deno.env.get("TATUM_API_KEY");
const HELIUS_API_KEY = Deno.env.get("HELIUS_API_KEY");
const TATUM_BASE_URL = "https://api.tatum.io/v3";
const TATUM_V4_BASE_URL = "https://api.tatum.io/v4";

// Helius RPC endpoints
const HELIUS_MAINNET_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_DEVNET_RPC = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

type Chain = "ethereum" | "bitcoin" | "solana" | "polygon" | "tron" | "arbitrum" | "bsc";

type ActionType =
  | "getBalance"
  | "getTransactions"
  | "estimateGas"
  | "getPrices"
  | "broadcastTransaction"
  | "solanaRpc";

interface WalletBalanceRequest {
  action: ActionType;
  chain: Chain;
  address: string;
  testnet?: boolean;
  symbols?: string[]; // For getPrices action
  // For broadcastTransaction action
  signedTransaction?: string;
  // For solanaRpc action
  rpcMethod?: string;
  rpcParams?: unknown[];
  to?: string;
  amount?: string;
  gasPrice?: string;
  gasLimit?: string;
}

interface ChainConfig {
  symbol: string;
  decimals: number;
  balanceEndpoint: (address: string, testnet: boolean) => string;
  txEndpoint: (address: string, testnet: boolean) => string;
  gasEndpoint: (testnet: boolean) => string;
  explorerUrl: (testnet: boolean) => string;
}

// Chain configurations for Tatum API v3 (excluding Solana which uses Helius)
const chainConfigs: Record<Chain, ChainConfig> = {
  ethereum: {
    symbol: "ETH",
    decimals: 18,
    balanceEndpoint: (address, testnet) =>
      `/ethereum/account/balance/${address}${testnet ? "?testnet=true" : ""}`,
    txEndpoint: (address, testnet) =>
      `/ethereum/account/transaction/${address}?pageSize=20${testnet ? "&testnet=true" : ""}`,
    gasEndpoint: (testnet) => `/ethereum/gas${testnet ? "?testnet=true" : ""}`,
    explorerUrl: (testnet) =>
      testnet ? "https://sepolia.etherscan.io" : "https://etherscan.io",
  },
  polygon: {
    symbol: "MATIC",
    decimals: 18,
    balanceEndpoint: (address, testnet) =>
      `/polygon/account/balance/${address}${testnet ? "?testnet=true" : ""}`,
    txEndpoint: (address, testnet) =>
      `/polygon/account/transaction/${address}?pageSize=20${testnet ? "&testnet=true" : ""}`,
    gasEndpoint: (testnet) => `/polygon/gas${testnet ? "?testnet=true" : ""}`,
    explorerUrl: (testnet) =>
      testnet ? "https://amoy.polygonscan.com" : "https://polygonscan.com",
  },
  bitcoin: {
    symbol: "BTC",
    decimals: 8,
    balanceEndpoint: (address, testnet) =>
      `/bitcoin/address/balance/${address}${testnet ? "?testnet=true" : ""}`,
    txEndpoint: (address, testnet) =>
      `/bitcoin/transaction/address/${address}?pageSize=20${testnet ? "&testnet=true" : ""}`,
    gasEndpoint: () => "/bitcoin/fee",
    explorerUrl: (testnet) =>
      testnet ? "https://mempool.space/testnet" : "https://mempool.space",
  },
  solana: {
    symbol: "SOL",
    decimals: 9,
    balanceEndpoint: () => "", // Not used - Helius RPC
    txEndpoint: () => "", // Not used - Helius RPC
    gasEndpoint: () => "", // Not used - Helius RPC
    explorerUrl: (testnet) =>
      testnet
        ? "https://explorer.solana.com?cluster=devnet"
        : "https://explorer.solana.com",
  },
  tron: {
    symbol: "TRX",
    decimals: 6,
    balanceEndpoint: (address) => `/tron/account/${address}`,
    txEndpoint: (address) => `/tron/transaction/account/${address}?pageSize=20`,
    gasEndpoint: () => "/tron/fee",
    explorerUrl: (testnet) =>
      testnet ? "https://shasta.tronscan.org" : "https://tronscan.org",
  },
  arbitrum: {
    symbol: "ETH",
    decimals: 18,
    balanceEndpoint: (address, testnet) =>
      `/ethereum/account/balance/${address}?type=arbitrum-one${testnet ? "&testnet=true" : ""}`,
    txEndpoint: (address, testnet) =>
      `/ethereum/account/transaction/${address}?type=arbitrum-one&pageSize=20${testnet ? "&testnet=true" : ""}`,
    gasEndpoint: (testnet) => `/ethereum/gas?type=arbitrum-one${testnet ? "&testnet=true" : ""}`,
    explorerUrl: (testnet) =>
      testnet ? "https://sepolia.arbiscan.io" : "https://arbiscan.io",
  },
  bsc: {
    symbol: "BNB",
    decimals: 18,
    balanceEndpoint: (address, testnet) =>
      `/bsc/account/balance/${address}${testnet ? "?testnet=true" : ""}`,
    txEndpoint: (address, testnet) =>
      `/bsc/account/transaction/${address}?pageSize=20${testnet ? "&testnet=true" : ""}`,
    gasEndpoint: (testnet) => `/bsc/gas${testnet ? "?testnet=true" : ""}`,
    explorerUrl: (testnet) =>
      testnet ? "https://testnet.bscscan.com" : "https://bscscan.com",
  },
};

// Known SPL tokens on Solana (mainnet mint addresses)
const KNOWN_SPL_TOKENS: Record<
  string,
  { name: string; symbol: string; decimals: number; logo?: string }
> = {
  // Major stablecoins
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },
  USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA: {
    name: "USDS",
    symbol: "USDS",
    decimals: 6,
    logo: "💵",
  },
  USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX: {
    name: "USDH",
    symbol: "USDH",
    decimals: 6,
    logo: "💵",
  },

  // Wrapped tokens
  So11111111111111111111111111111111111111112: {
    name: "Wrapped SOL",
    symbol: "WSOL",
    decimals: 9,
    logo: "◎",
  },
  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E": {
    name: "Wrapped BTC (Sollet)",
    symbol: "BTC",
    decimals: 6,
    logo: "₿",
  },
  "2FPyTwcZLUg1MDrwsyoP4D6s1tM7hAkHYRjkNb5w6Pxk": {
    name: "Wrapped ETH (Sollet)",
    symbol: "ETH",
    decimals: 6,
    logo: "⟠",
  },
  "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs": {
    name: "Wrapped ETH (Wormhole)",
    symbol: "weETH",
    decimals: 8,
    logo: "⟠",
  },
  "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh": {
    name: "Wrapped BTC (Wormhole)",
    symbol: "wBTC",
    decimals: 8,
    logo: "₿",
  },

  // Major DeFi tokens
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: {
    name: "Jupiter",
    symbol: "JUP",
    decimals: 6,
    logo: "🪐",
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    name: "Marinade Staked SOL",
    symbol: "mSOL",
    decimals: 9,
    logo: "🥩",
  },
  "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj": {
    name: "Lido Staked SOL",
    symbol: "stSOL",
    decimals: 9,
    logo: "🌊",
  },
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: {
    name: "JTO",
    symbol: "JTO",
    decimals: 9,
    logo: "🏛️",
  },
  orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE: {
    name: "Orca",
    symbol: "ORCA",
    decimals: 6,
    logo: "🐋",
  },
  RasYALBDLb3vW7icNVHzkd9E6VHM7qQKoTkbUPSBvrd: {
    name: "Raydium",
    symbol: "RAY",
    decimals: 6,
    logo: "☀️",
  },
  SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt: {
    name: "Serum",
    symbol: "SRM",
    decimals: 6,
    logo: "🧪",
  },

  // Meme coins
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    name: "Bonk",
    symbol: "BONK",
    decimals: 5,
    logo: "🐕",
  },
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: {
    name: "dogwifhat",
    symbol: "WIF",
    decimals: 6,
    logo: "🐶",
  },
  ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY: {
    name: "MOODENG",
    symbol: "MOODENG",
    decimals: 6,
    logo: "🦛",
  },

  // Gaming/NFT tokens
  ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx: {
    name: "Star Atlas",
    symbol: "ATLAS",
    decimals: 8,
    logo: "🚀",
  },
  poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk: {
    name: "Star Atlas DAO",
    symbol: "POLIS",
    decimals: 8,
    logo: "🏛️",
  },
};

// Known TRC-20 tokens on Tron (mainnet contract addresses)
const KNOWN_TRC20_TOKENS: Record<
  string,
  { name: string; symbol: string; decimals: number; logo?: string }
> = {
  // Major stablecoins
  TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },
  TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  TUPM7K8REVzD2UdV4R5fe5M8XbnR2DdoJ6: {
    name: "TrueUSD",
    symbol: "TUSD",
    decimals: 18,
    logo: "💵",
  },
  TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT: {
    name: "USDD",
    symbol: "USDD",
    decimals: 18,
    logo: "💵",
  },

  // Wrapped tokens
  TXpw8XeWYeTUd4quDskoUqeQPowRh4jY65: {
    name: "Wrapped BTC",
    symbol: "WBTC",
    decimals: 8,
    logo: "₿",
  },
  THb4CqiFdwNHsWsQCs4JhzwjMWys4aqCbF: {
    name: "Wrapped ETH",
    symbol: "WETH",
    decimals: 18,
    logo: "⟠",
  },
  TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR: {
    name: "Wrapped TRX",
    symbol: "WTRX",
    decimals: 6,
    logo: "◈",
  },

  // DeFi tokens
  TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9: {
    name: "SunToken",
    symbol: "SUN",
    decimals: 18,
    logo: "☀️",
  },
  TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7: {
    name: "WINk",
    symbol: "WIN",
    decimals: 6,
    logo: "🃏",
  },
  TSSMHYeV2uE9qYH95DqyoCuNCzEL1NvU3S: {
    name: "JUST",
    symbol: "JST",
    decimals: 18,
    logo: "⚖️",
  },
  TAFjULxiVgT4qWk6UZwjqwZXTSaGaqnVp4: {
    name: "BitTorrent",
    symbol: "BTT",
    decimals: 18,
    logo: "🔄",
  },

  // Other popular tokens
  TF17BgPaZYbz8oxbjhriubPDsA7ArKoLX3: {
    name: "JUST Stablecoin",
    symbol: "USDJ",
    decimals: 18,
    logo: "💵",
  },
  TCFLL5dx5ZJdKnWuesXxi1VPwjLVmWZZy9: {
    name: "JUST",
    symbol: "JST",
    decimals: 18,
    logo: "⚖️",
  },
};

async function tatumRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${TATUM_BASE_URL}${endpoint}`;
  console.log(`Tatum request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": TATUM_API_KEY!,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Tatum API error: ${response.status} - ${responseText}`);
    throw new Error(`Tatum API error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.log("Raw response:", responseText);
    return { balance: responseText };
  }
}

async function tatumRequestV4(endpoint: string, options: RequestInit = {}) {
  const url = `${TATUM_V4_BASE_URL}${endpoint}`;
  console.log(`Tatum v4 request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": TATUM_API_KEY!,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Tatum v4 API error: ${response.status} - ${responseText}`);
    throw new Error(`Tatum v4 API error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.log("Tatum v4 raw response:", responseText);
    return responseText;
  }
}

// Special Tatum request handler for Tron that gracefully handles 403 "account not found" errors
async function tatumRequestTron(endpoint: string, options: RequestInit = {}) {
  const url = `${TATUM_BASE_URL}${endpoint}`;
  console.log(`Tatum Tron request: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      "x-api-key": TATUM_API_KEY!,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    // Handle 403 "account not found" as zero balance (common for new/inactive Tron addresses)
    if (
      response.status === 403 &&
      responseText.includes("tron.account.not.found")
    ) {
      console.log(
        "Tron account not found (never activated), returning zero balance",
      );
      return { balance: 0, trc20: [] };
    }
    console.error(`Tatum Tron API error: ${response.status} - ${responseText}`);
    throw new Error(`Tatum API error: ${response.status} - ${responseText}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.log("Tatum Tron raw response:", responseText);
    return { balance: responseText };
  }
}

type TronGridTrc20Tx = {
  transaction_id?: string;
  from?: string;
  to?: string;
  value?: string;
  block_timestamp?: number;
  token_info?: {
    address?: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
};

// Tron account tx endpoint (Tatum) can miss TRC-20 transfers where the address is only the recipient.
// TronGrid provides recipient-side TRC-20 transfers, so we merge those in for a complete history.
async function fetchTronGridTrc20Incoming(
  address: string,
  testnet: boolean,
): Promise<TronGridTrc20Tx[]> {
  const base = testnet
    ? "https://api.shasta.trongrid.io"
    : "https://api.trongrid.io";
  const url = `${base}/v1/accounts/${address}/transactions/trc20?limit=50&only_confirmed=true&only_to=true`;
  try {
    const resp = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.warn(`TronGrid TRC-20 incoming error: ${resp.status} - ${text}`);
      return [];
    }
    const json = await resp.json();
    const data = (json?.data ?? []) as TronGridTrc20Tx[];
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("TronGrid TRC-20 incoming fetch failed:", e);
    return [];
  }
}

// Helius RPC request helper
async function heliusRpcRequest(
  method: string,
  params: unknown[],
  testnet: boolean = false,
) {
  const rpcUrl = testnet ? HELIUS_DEVNET_RPC : HELIUS_MAINNET_RPC;

  const rpcBody = {
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  };

  console.log(
    `Helius RPC request: ${method} (${testnet ? "devnet" : "mainnet"})`,
  );

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(rpcBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`Helius RPC error: ${response.status} - ${responseText}`);
    throw new Error(`Helius RPC error: ${response.status} - ${responseText}`);
  }

  const rpcResult = JSON.parse(responseText);

  if (rpcResult.error) {
    console.error(`Helius RPC error:`, rpcResult.error);
    throw new Error(rpcResult.error.message || "Helius RPC error");
  }

  return rpcResult.result;
}

function toBaseUnits(value: string | number, decimals: number): string {
  const s = String(value ?? "0").trim();
  if (!s || s === "0") return "0";

  const negative = s.startsWith("-");
  const unsigned = negative ? s.slice(1) : s;

  const [intPartRaw, fracRaw = ""] = unsigned.split(".");
  const intPart = (intPartRaw || "0").replace(/^0+(?=\d)/, "") || "0";
  const frac = fracRaw.padEnd(decimals, "0").slice(0, decimals);

  // Combine and strip leading zeros
  const combined = `${intPart}${frac}`.replace(/^0+(?=\d)/, "") || "0";
  return negative ? `-${combined}` : combined;
}

function isNonZeroBaseUnit(balance: string): boolean {
  return !!balance && balance !== "0";
}

type RawTokenBalance = {
  tokenAddress?: string;
  contractAddress?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  balance?: string | number;
  type?: string;
  tokenType?: string;
};

function extractV4Balances(raw: unknown): RawTokenBalance[] {
  if (Array.isArray(raw)) {
    const first = raw[0] as any;
    if (first && Array.isArray(first.balances)) return first.balances;
    return raw as RawTokenBalance[];
  }

  const obj = raw as any;
  if (obj && Array.isArray(obj.balances)) return obj.balances;
  if (obj && Array.isArray(obj.data)) return obj.data;
  if (obj && Array.isArray(obj.result)) return obj.result;
  return [];
}

// Popular ERC-20 tokens
const KNOWN_TOKENS: Record<
  string,
  { name: string; symbol: string; decimals: number; logo?: string }
> = {
  // Ethereum Mainnet
  "0xdac17f958d2ee523a2206206994597c13d831ec7": {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    logo: "⟠",
  },

  // Ethereum Sepolia testnet tokens
  "0x779877a7b0d9e8603169ddbd7836e478b4624789": {
    name: "Chainlink",
    symbol: "LINK",
    decimals: 18,
    logo: "🔗",
  },
  "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0": {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },
  "0x7b79995e5f793a07bc00c21412e50ecae098e7f9": {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    logo: "⟠",
  },

  // Polygon Amoy testnet tokens
  "0x0fa8781a83e46826621b3bc094ea2a0212e71b23": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  "0x360ad4f9a9a8efe9a8dcb5f461c4cc1047e1dcf9": {
    name: "Wrapped Matic",
    symbol: "WMATIC",
    decimals: 18,
    logo: "⬡",
  },

  // Polygon Mainnet
  "0x2791bca1f2de4661ed88a30c99a7a9449aa84174": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    logo: "⟠",
  },
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },

  // Arbitrum One Mainnet
  "0xaf88d065e77c8cc2239327c5edb3a432268e5831": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
    logo: "💵",
  },
  "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8": {
    name: "USD Coin (Bridged)",
    symbol: "USDC.e",
    decimals: 6,
    logo: "💵",
  },
  "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9": {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 6,
    logo: "💲",
  },
  "0x912ce59144191c1204e64559fe8253a0e49e6548": {
    name: "Arbitrum",
    symbol: "ARB",
    decimals: 18,
    logo: "◆",
  },
  "0x82af49447d8a07e3bd95bd0d56f35241523fbab1": {
    name: "Wrapped Ether",
    symbol: "WETH",
    decimals: 18,
    logo: "⟠",
  },
  "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f": {
    name: "Wrapped BTC",
    symbol: "WBTC",
    decimals: 8,
    logo: "₿",
  },

  // BSC Mainnet
  "0x55d398326f99059ff775485246999027b3197955": {
    name: "Tether USD",
    symbol: "USDT",
    decimals: 18,
    logo: "💲",
  },
  "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d": {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
    logo: "💵",
  },
  "0xe9e7cea3dedca5984780bafc599bd69add087d56": {
    name: "BUSD Token",
    symbol: "BUSD",
    decimals: 18,
    logo: "💵",
  },
  "0x2170ed0880ac9a755fd29b2688956bd959f933f8": {
    name: "Wrapped Ether",
    symbol: "ETH",
    decimals: 18,
    logo: "⟠",
  },
  "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": {
    name: "Wrapped BTC",
    symbol: "BTCB",
    decimals: 18,
    logo: "₿",
  },
};

// Known ERC-20 tokens per chain for direct RPC balance fetching
const ARBITRUM_TOKENS: Array<{ address: string; symbol: string; name: string; decimals: number }> = [
  { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
  { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC.e", name: "USD Coin (Bridged)", decimals: 6 },
  { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD", decimals: 6 },
  { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18 },
  { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  { address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
];

const BSC_TOKENS: Array<{ address: string; symbol: string; name: string; decimals: number }> = [
  { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18 },
  { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
  { address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", symbol: "BUSD", name: "BUSD Token", decimals: 18 },
  { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Wrapped Ether", decimals: 18 },
  { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Wrapped BTC", decimals: 18 },
  { address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE", symbol: "XRP", name: "XRP Token", decimals: 18 },
];

// Call balanceOf(address) via JSON-RPC eth_call
async function rpcERC20BalanceOf(rpcUrl: string, tokenAddress: string, walletAddress: string): Promise<string> {
  // ABI encode: balanceOf(address) selector = 0x70a08231, pad address to 32 bytes
  const paddedAddress = walletAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const data = "0x70a08231" + paddedAddress;

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: tokenAddress, data }, "latest"],
  };

  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  const hex = json?.result;
  if (!hex || hex === "0x" || hex === "0x0000000000000000000000000000000000000000000000000000000000000000") return "0";
  return BigInt(hex).toString();
}

// Direct RPC token fetching for Arbitrum (Tatum v4 doesn't reliably return Arbitrum tokens)
async function getArbitrumTokensViaRPC(address: string): Promise<Array<{ symbol: string; name: string; balance: string; decimals: number; contractAddress: string }>> {
  const RPC_URL = "https://arb1.arbitrum.io/rpc";
  const results = await Promise.allSettled(
    ARBITRUM_TOKENS.map(async (token) => {
      const balance = await rpcERC20BalanceOf(RPC_URL, token.address, address);
      return { ...token, balance, contractAddress: token.address };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ symbol: string; name: string; balance: string; decimals: number; contractAddress: string }> =>
      r.status === "fulfilled" && r.value.balance !== "0"
    )
    .map((r) => r.value);
}

// Direct RPC token fetching for BSC
async function getBSCTokensViaRPC(address: string): Promise<Array<{ symbol: string; name: string; balance: string; decimals: number; contractAddress: string }>> {
  const RPC_URL = "https://bsc-dataseed.binance.org";
  const results = await Promise.allSettled(
    BSC_TOKENS.map(async (token) => {
      const balance = await rpcERC20BalanceOf(RPC_URL, token.address, address);
      return { ...token, balance, contractAddress: token.address };
    })
  );
  return results
    .filter((r): r is PromiseFulfilledResult<{ symbol: string; name: string; balance: string; decimals: number; contractAddress: string }> =>
      r.status === "fulfilled" && r.value.balance !== "0"
    )
    .map((r) => r.value);
}

async function getERC20Tokens(
  chain: Chain,
  address: string,
  testnet: boolean,
): Promise<
  Array<{
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    contractAddress: string;
    logo?: string;
  }>
> {
  // Only fetch tokens for supported EVM chains
  if (chain !== "ethereum" && chain !== "polygon" && chain !== "arbitrum" && chain !== "bsc") {
    return [];
  }

  // Arbitrum: use direct RPC calls (Tatum v4 doesn't reliably return Arbitrum tokens)
  if (chain === "arbitrum") {
    console.log(`Fetching Arbitrum tokens via direct RPC for: ${address}`);
    return getArbitrumTokensViaRPC(address);
  }

  // BSC: use direct RPC calls
  if (chain === "bsc") {
    console.log(`Fetching BSC tokens via direct RPC for: ${address}`);
    return getBSCTokensViaRPC(address);
  }

  // Ethereum & Polygon: use Tatum v4
  try {
    const endpoint = `/data/balances?chain=${chain}&addresses=${encodeURIComponent(address)}`;
    console.log(`Fetching ERC-20 tokens (v4) for ${chain}: ${endpoint}`);

    const raw = await tatumRequestV4(endpoint);
    const balances = extractV4Balances(raw);

    const tokens = balances
      .filter((b) => {
        const addr = (b.tokenAddress || b.contractAddress || "").toLowerCase();
        if (!addr || addr === "native") return false;
        return true;
      })
      .map((b) => {
        const contractAddress = b.tokenAddress || b.contractAddress || "";
        const decimals = typeof b.decimals === "number" ? b.decimals : 18;
        const knownToken = KNOWN_TOKENS[contractAddress.toLowerCase()];
        const baseBalance = toBaseUnits(
          b.balance ?? "0",
          knownToken?.decimals ?? decimals,
        );

        return {
          symbol: knownToken?.symbol || b.symbol || "UNKNOWN",
          name: knownToken?.name || b.name || "Unknown Token",
          balance: baseBalance,
          decimals: knownToken?.decimals || decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter((t) => isNonZeroBaseUnit(t.balance));

    return tokens;
  } catch (error) {
    console.error(`Error fetching ${chain} ERC-20 tokens (v4):`, error);
    return [];
  }
}

// ==================== HELIUS SOLANA FUNCTIONS ====================

// Fetch SOL balance using Helius RPC
async function getSolanaBalance(
  address: string,
  testnet: boolean = false,
): Promise<string> {
  try {
    console.log(`Fetching SOL balance via Helius RPC for: ${address}`);

    const result = await heliusRpcRequest("getBalance", [address], testnet);
    const lamports = result?.value ?? 0;

    console.log(`Helius SOL balance: ${lamports} lamports`);
    return String(lamports);
  } catch (error) {
    console.error(`Error fetching Solana balance via Helius:`, error);
    return "0";
  }
}

// Fetch SPL tokens using Helius RPC
async function getSPLTokens(
  address: string,
  testnet: boolean = false,
): Promise<
  Array<{
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    contractAddress: string;
    logo?: string;
  }>
> {
  try {
    console.log(`Fetching SPL tokens via Helius RPC for: ${address}`);

    const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

    const result = await heliusRpcRequest(
      "getTokenAccountsByOwner",
      [address, { programId: TOKEN_PROGRAM_ID }, { encoding: "jsonParsed" }],
      testnet,
    );

    const tokenAccounts = result?.value || [];
    console.log(`Helius found ${tokenAccounts.length} SPL token accounts`);

    const tokens = tokenAccounts
      .map(
        (account: {
          account: {
            data: {
              parsed: {
                info: {
                  mint: string;
                  tokenAmount: {
                    amount: string;
                    decimals: number;
                    uiAmountString: string;
                  };
                };
              };
            };
          };
        }) => {
          const info = account.account?.data?.parsed?.info;
          if (!info) return null;

          const contractAddress = info.mint;
          const tokenAmount = info.tokenAmount;
          const knownToken = KNOWN_SPL_TOKENS[contractAddress] || undefined;
          const decimals = knownToken?.decimals ?? tokenAmount.decimals;
          const balance = tokenAmount.amount;

          return {
            symbol: knownToken?.symbol || "UNKNOWN",
            name: knownToken?.name || "Unknown Token",
            balance,
            decimals,
            contractAddress,
            logo: knownToken?.logo,
          };
        },
      )
      .filter(
        (
          t: { balance: string } | null,
        ): t is {
          balance: string;
          symbol: string;
          name: string;
          decimals: number;
          contractAddress: string;
          logo?: string;
        } => t !== null && isNonZeroBaseUnit(t.balance),
      );

    return tokens;
  } catch (error) {
    console.error(`Error fetching Solana SPL tokens via Helius:`, error);
    return [];
  }
}

// Fetch TRC-20 tokens for Tron addresses
async function getTRC20Tokens(address: string): Promise<
  Array<{
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    contractAddress: string;
    logo?: string;
  }>
> {
  try {
    const endpoint = `/tron/account/${address}`;
    console.log(`Fetching TRC-20 tokens for tron address: ${address}`);

    const accountData = await tatumRequest(endpoint);
    console.log(
      `Tron account data:`,
      JSON.stringify(accountData).slice(0, 1000),
    );

    const trc20Balances = accountData.trc20 || [];

    const tokens = trc20Balances
      .map((tokenBalance: Record<string, string>) => {
        const contractAddress = Object.keys(tokenBalance)[0];
        const rawBalance = tokenBalance[contractAddress];

        if (!contractAddress || !rawBalance) return null;

        const knownToken = KNOWN_TRC20_TOKENS[contractAddress];
        const decimals = knownToken?.decimals ?? 6;

        return {
          symbol: knownToken?.symbol || "UNKNOWN",
          name: knownToken?.name || "Unknown Token",
          balance: rawBalance,
          decimals,
          contractAddress,
          logo: knownToken?.logo,
        };
      })
      .filter(
        (
          t: { balance: string } | null,
        ): t is {
          balance: string;
          symbol: string;
          name: string;
          decimals: number;
          contractAddress: string;
          logo?: string;
        } => t !== null && isNonZeroBaseUnit(t.balance),
      );

    return tokens;
  } catch (error) {
    console.error(`Error fetching Tron TRC-20 tokens:`, error);
    return [];
  }
}

// Unified token fetching function
async function getTokens(
  chain: Chain,
  address: string,
  testnet: boolean,
): Promise<
  Array<{
    symbol: string;
    name: string;
    balance: string;
    decimals: number;
    contractAddress: string;
    logo?: string;
  }>
> {
  if (chain === "solana") {
    return getSPLTokens(address, testnet);
  } else if (chain === "tron") {
    return getTRC20Tokens(address);
  } else if (chain === "ethereum" || chain === "polygon" || chain === "arbitrum" || chain === "bsc") {
    return getERC20Tokens(chain, address, testnet);
  }
  return [];
}

// Fetch native ETH balance via direct JSON-RPC (eth_getBalance)
async function rpcGetNativeBalance(rpcUrl: string, address: string): Promise<string> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getBalance",
    params: [address, "latest"],
  };
  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  const hex = json?.result;
  if (!hex || hex === "0x0") return "0";
  return BigInt(hex).toString();
}

async function getBalance(
  chain: Chain,
  address: string,
  testnet: boolean = true,
) {
  const config = chainConfigs[chain];

  try {
    // Handle Solana separately using Helius RPC
    if (chain === "solana") {
      const [solBalance, tokens] = await Promise.all([
        getSolanaBalance(address, testnet),
        getSPLTokens(address, testnet),
      ]);

      console.log(`Helius Solana balance: ${solBalance} lamports`);

      return {
        chain,
        native: {
          symbol: config.symbol,
          balance: solBalance,
          decimals: config.decimals,
        },
        tokens,
        explorerUrl: config.explorerUrl(testnet),
      };
    }

    // Arbitrum: use direct RPC for accurate native ETH balance (Tatum returns Ethereum mainnet balance)
    if (chain === "arbitrum") {
      console.log(`Fetching Arbitrum native ETH balance via direct RPC for: ${address}`);
      const [nativeBalance, tokens] = await Promise.all([
        rpcGetNativeBalance("https://arb1.arbitrum.io/rpc", address),
        getArbitrumTokensViaRPC(address),
      ]);
      console.log(`Arbitrum native ETH balance: ${nativeBalance} wei`);
      return {
        chain,
        native: { symbol: "ETH", balance: nativeBalance, decimals: 18 },
        tokens,
        explorerUrl: config.explorerUrl(testnet),
      };
    }

    // BSC: use direct RPC for accurate native BNB balance
    if (chain === "bsc") {
      console.log(`Fetching BSC native BNB balance via direct RPC for: ${address}`);
      const [nativeBalance, tokens] = await Promise.all([
        rpcGetNativeBalance("https://bsc-dataseed.binance.org", address),
        getBSCTokensViaRPC(address),
      ]);
      console.log(`BSC native BNB balance: ${nativeBalance} wei`);
      return {
        chain,
        native: { symbol: "BNB", balance: nativeBalance, decimals: 18 },
        tokens,
        explorerUrl: config.explorerUrl(testnet),
      };
    }

    // Fetch native balance and tokens in parallel for other chains
    const [balanceData, tokens] = await Promise.all([
      chain === "tron"
        ? tatumRequestTron(config.balanceEndpoint(address, testnet))
        : tatumRequest(config.balanceEndpoint(address, testnet)),
      getTokens(chain, address, testnet),
    ]);

    console.log(`${chain} balance response:`, JSON.stringify(balanceData));

    let rawBalance: string | number = "0";

    if (chain === "tron") {
      if (typeof balanceData === "object" && balanceData) {
        rawBalance = balanceData.balance ?? "0";
      }
    } else if (typeof balanceData === "object" && balanceData) {
      const bd: any = balanceData;
      rawBalance =
        bd.balance ??
        (bd.incoming
          ? parseFloat(bd.incoming) - parseFloat(bd.outgoing || "0")
          : "0");
    } else if (
      typeof balanceData === "string" ||
      typeof balanceData === "number"
    ) {
      rawBalance = balanceData;
    }

    const balance =
      chain === "tron"
        ? String(rawBalance)
        : toBaseUnits(rawBalance, config.decimals);

    return {
      chain,
      native: {
        symbol: config.symbol,
        balance,
        decimals: config.decimals,
      },
      tokens,
      explorerUrl: config.explorerUrl(testnet),
    };
  } catch (error) {
    console.error(`Error fetching ${chain} balance:`, error);
    return {
      chain,
      native: {
        symbol: config.symbol,
        balance: "0",
        decimals: config.decimals,
      },
      tokens: [],
      explorerUrl: config.explorerUrl(testnet),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ==================== HELIUS SOLANA TRANSACTIONS ====================

interface SolanaTokenTransfer {
  source: string;
  destination: string;
  amount: string;
  decimals?: number;
  mint?: string;
  symbol?: string;
}

interface ParsedInstruction {
  programId: string;
  programName: string;
  type: string;
  info?: Record<string, unknown>;
}

interface SolanaTransactionDetail {
  hash: string;
  from?: string;
  to?: string;
  value?: string;
  timestamp: number;
  status: string;
  blockNumber?: number;
  fee?: number;
  parsedInstructions?: ParsedInstruction[];
  tokenTransfers?: SolanaTokenTransfer[];
  signers?: string[];
  logs?: string[];
}

const PROGRAM_NAMES: Record<string, string> = {
  "11111111111111111111111111111111": "System Program",
  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: "Token Program",
  TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "Associated Token",
  ComputeBudget111111111111111111111111111111: "Compute Budget",
  Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: "Memo Program",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo Program v2",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter Aggregator",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpool",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM",
  srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX: "Serum DEX",
};

async function getSolanaTransactions(
  address: string,
  testnet: boolean = false,
): Promise<{
  chain: string;
  transactions: SolanaTransactionDetail[];
  explorerUrl: string;
  error?: string;
}> {
  try {
    console.log(`Fetching Solana transactions via Helius RPC for: ${address}`);

    // IMPORTANT: The asset detail sheet filters token activity client-side by `tokenTransfers[].mint`.
    // If we only fetch a small number of recent signatures, users with many token transfers may
    // see just 1–2 items after filtering. We fetch more signatures + details here to provide
    // a richer history while still keeping a hard cap to avoid excessive RPC calls.
    const SIGNATURE_LIMIT = 200;
    const MAX_TX_DETAILS = 100;
    const CONCURRENCY = 8;

    const mapWithConcurrency = async <T, R>(
      items: T[],
      limit: number,
      fn: (item: T) => Promise<R>,
    ): Promise<R[]> => {
      const results: R[] = new Array(items.length) as R[];
      let cursor = 0;
      const workerCount = Math.max(1, Math.min(limit, items.length));

      const workers = Array.from({ length: workerCount }, async () => {
        while (cursor < items.length) {
          const currentIndex = cursor++;
          results[currentIndex] = await fn(items[currentIndex]);
        }
      });

      await Promise.all(workers);
      return results;
    };

    // Step 1: Get recent transaction signatures
    type SolanaSignatureInfo = { signature: string; blockTime?: number | null };

    const signaturesRaw = await heliusRpcRequest(
      "getSignaturesForAddress",
      [address, { limit: SIGNATURE_LIMIT }],
      testnet,
    );

    const signatures = (
      Array.isArray(signaturesRaw)
        ? (signaturesRaw as SolanaSignatureInfo[])
        : []
    ).filter((s) => !!s?.signature);

    console.log(
      `Helius found ${signatures?.length || 0} transaction signatures`,
    );

    if (!signatures || signatures.length === 0) {
      return {
        chain: "solana",
        transactions: [],
        explorerUrl: testnet
          ? "https://explorer.solana.com?cluster=devnet"
          : "https://explorer.solana.com",
      };
    }

    // Step 2: Fetch transaction details (in parallel, capped)
    const transactionsToFetch: SolanaSignatureInfo[] = signatures.slice(
      0,
      MAX_TX_DETAILS,
    );

    const maybeTxs = await mapWithConcurrency(
      transactionsToFetch,
      CONCURRENCY,
      async (sig) => {
        try {
          const tx = await heliusRpcRequest(
            "getTransaction",
            [
              sig.signature,
              { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
            ],
            testnet,
          );

          if (!tx) {
            console.log(`Skipping tx ${sig.signature}: no result`);
            return null;
          }

          const meta = tx.meta;
          const message = tx.transaction?.message;
          const accountKeys = message?.accountKeys || [];

          // Build a lookup for SPL token accounts so we can resolve mint/decimals/owners
          // for Token Program `transfer` instructions (which don't include mint/decimals).
          const tokenAccountInfo = new Map<
            string,
            { mint?: string; decimals?: number; owner?: string }
          >();
          const tokenBalanceEntries = [
            ...((meta?.preTokenBalances ?? []) as any[]),
            ...((meta?.postTokenBalances ?? []) as any[]),
          ];
          for (const tb of tokenBalanceEntries) {
            const idx = tb?.accountIndex;
            const keyObj =
              typeof idx === "number" ? accountKeys[idx] : undefined;
            const tokenAccount = keyObj?.pubkey || keyObj;
            if (!tokenAccount) continue;

            const existing = tokenAccountInfo.get(tokenAccount) || {};
            const decimals = tb?.uiTokenAmount?.decimals;

            tokenAccountInfo.set(tokenAccount, {
              mint: tb?.mint ?? existing.mint,
              decimals:
                typeof decimals === "number" ? decimals : existing.decimals,
              owner: tb?.owner ?? existing.owner,
            });
          }

          const parsedInstructions: ParsedInstruction[] = [];
          const tokenTransfers: SolanaTokenTransfer[] = [];
          const instructions = message?.instructions || [];
          const innerInstructions = meta?.innerInstructions || [];

          const allInstructions = [
            ...instructions,
            ...innerInstructions.flatMap(
              (inner: { instructions: unknown[] }) => inner.instructions || [],
            ),
          ];

          let from: string | undefined;
          let to: string | undefined;
          let value: string | undefined;

          for (const ix of allInstructions) {
            const programId = ix.programId?.toString() || ix.program || "";
            const programName = PROGRAM_NAMES[programId] || "Unknown Program";

            if (ix.parsed) {
              const parsedType = ix.parsed.type || "unknown";
              const info = ix.parsed.info || {};

              parsedInstructions.push({
                programId,
                programName,
                type: parsedType,
                info,
              });

              if (parsedType === "transfer") {
                const source = info.source as string;
                const destination = info.destination as string;

                // System Program transfer = native SOL
                if (programId === "11111111111111111111111111111111") {
                  const lamports = info.lamports as number;

                  if (!from) from = source;
                  if (!to) to = destination;
                  if (!value) value = lamports?.toString();

                  tokenTransfers.push({
                    source,
                    destination,
                    amount: lamports?.toString() || "0",
                    decimals: 9,
                    symbol: "SOL",
                  });
                }

                // Token Program transfer = SPL token (amount is base units)
                if (
                  programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" ||
                  programId === "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
                ) {
                  const amount = (info.amount as string) || "0";
                  const srcInfo = tokenAccountInfo.get(source) || {};
                  const dstInfo = tokenAccountInfo.get(destination) || {};
                  const mint = srcInfo.mint || dstInfo.mint;
                  const decimals = srcInfo.decimals ?? dstInfo.decimals;
                  const known = mint ? KNOWN_SPL_TOKENS[mint] : undefined;
                  const symbol = known?.symbol || "SPL";

                  const sourceOwner = srcInfo.owner || source;
                  const destinationOwner = dstInfo.owner || destination;

                  if (!from) from = sourceOwner;
                  if (!to) to = destinationOwner;
                  if (!value) value = amount;

                  tokenTransfers.push({
                    source: sourceOwner,
                    destination: destinationOwner,
                    amount,
                    decimals,
                    mint,
                    symbol,
                  });
                }
              } else if (parsedType === "transferChecked") {
                const source = info.source as string;
                const destination = info.destination as string;
                const tokenAmount = info.tokenAmount as {
                  amount?: string;
                  decimals?: number;
                };
                const mint = info.mint as string;

                const srcInfo = tokenAccountInfo.get(source) || {};
                const dstInfo = tokenAccountInfo.get(destination) || {};
                const sourceOwner = srcInfo.owner || source;
                const destinationOwner = dstInfo.owner || destination;
                const known = mint ? KNOWN_SPL_TOKENS[mint] : undefined;

                if (!from) from = sourceOwner;
                if (!to) to = destinationOwner;
                if (!value) value = tokenAmount?.amount;

                tokenTransfers.push({
                  source: sourceOwner,
                  destination: destinationOwner,
                  amount: tokenAmount?.amount || "0",
                  decimals: tokenAmount?.decimals ?? known?.decimals,
                  mint,
                  symbol: known?.symbol || "SPL",
                });
              } else if (
                parsedType === "createAccount" ||
                parsedType === "createAccountWithSeed"
              ) {
                parsedInstructions.push({
                  programId,
                  programName,
                  type: parsedType,
                  info,
                });
              }
            } else {
              parsedInstructions.push({
                programId,
                programName,
                type: "instruction",
              });
            }
          }

          if (!from && accountKeys.length > 0) {
            from = accountKeys[0]?.pubkey || accountKeys[0];
          }

          if (!value && meta?.preBalances && meta?.postBalances) {
            const preBalance = meta.preBalances[0] || 0;
            const postBalance = meta.postBalances[0] || 0;
            const diff = Math.abs(postBalance - preBalance);
            if (diff > 0) {
              value = diff.toString();
            }
          }

          const signers: string[] = accountKeys
            .filter((acc: { signer?: boolean }) => acc.signer)
            .map((acc: { pubkey?: string }) => acc.pubkey || "");

          const fee = meta?.fee || 0;
          const logs = (meta?.logMessages || []).slice(0, 10);

          const out: SolanaTransactionDetail = {
            hash: sig.signature,
            from,
            to,
            value,
            timestamp:
              sig.blockTime || tx.blockTime || Math.floor(Date.now() / 1000),
            status: meta?.err ? "failed" : "confirmed",
            blockNumber: tx.slot,
            fee,
            parsedInstructions: parsedInstructions.slice(0, 20),
            tokenTransfers,
            signers,
            logs,
          };

          return out;
        } catch (txError) {
          console.error(`Error processing tx ${sig.signature}:`, txError);
          return null;
        }
      },
    );

    const transactions = maybeTxs.filter(
      (t): t is SolanaTransactionDetail => !!t,
    );

    console.log(
      `Fetched ${transactions.length} Solana transactions via Helius`,
    );
    return {
      chain: "solana",
      transactions,
      explorerUrl: testnet
        ? "https://explorer.solana.com?cluster=devnet"
        : "https://explorer.solana.com",
    };
  } catch (error) {
    console.error("Error fetching Solana transactions via Helius:", error);
    return {
      chain: "solana",
      transactions: [],
      explorerUrl: testnet
        ? "https://explorer.solana.com?cluster=devnet"
        : "https://explorer.solana.com",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fetch Arbitrum token transfers via Blockscout API (free, no API key)
async function fetchArbitrumTokenTransfers(address: string): Promise<Array<Record<string, unknown>>> {
  try {
    const url = `https://arbitrum.blockscout.com/api?module=account&action=tokentx&address=${address}&page=1&offset=50&sort=desc`;
    console.log(`Fetching Arbitrum token transfers via Blockscout`);
    const resp = await fetch(url, { headers: { accept: "application/json" } });
    const text = await resp.text();
    console.log(`Blockscout response status=${resp.status}, body=${text.slice(0, 500)}`);
    if (!resp.ok) return [];
    const json = JSON.parse(text);
    if (json.status !== "1" || !Array.isArray(json.result)) {
      console.log(`Blockscout: status=${json.status}, message=${json.message}`);
      return [];
    }
    console.log(`Blockscout: found ${json.result.length} token transfers`);
    return json.result.map((t: any) => ({
      hash: t.hash,
      from: t.from,
      to: t.to,
      value: t.value || "0",
      timestamp: Number(t.timeStamp) || 0,
      status: "confirmed",
      blockNumber: Number(t.blockNumber),
      contractAddress: t.contractAddress,
      tokenSymbol: t.tokenSymbol || "ERC20",
      tokenName: t.tokenName || "Unknown Token",
      tokenDecimal: Number(t.tokenDecimal) || 18,
    }));
  } catch (e) { console.warn("Blockscout Arbitrum token tx fetch failed:", e); return []; }
}

async function getTransactions(
  chain: Chain,
  address: string,
  testnet: boolean = true,
) {
  const config = chainConfigs[chain];

  // Use Helius RPC for Solana transactions
  if (chain === "solana") {
    return getSolanaTransactions(address, testnet);
  }

  try {
    const endpoint = config.txEndpoint(address, testnet);
    const txData = await tatumRequest(endpoint);
    console.log(`${chain} transactions response:`, JSON.stringify(txData));

    const transactions = Array.isArray(txData)
      ? txData
      : txData.transactions || [];

    // Transform transactions with chain-specific parsing
    let parsedTransactions = transactions.map((tx: Record<string, unknown>) => {
      // Handle Tron's nested structure
      if (chain === "tron" && tx.rawData) {
        const rawData = tx.rawData as {
          contract?: Array<{
            parameter?: {
              value?: {
                amount?: number;
                ownerAddressBase58?: string;
                toAddressBase58?: string;
                owner_address?: string;
                to_address?: string;
                data?: string;
                contract_address?: string;
              };
            };
            type?: string;
          }>;
          timestamp?: number;
        };
        const contract = rawData.contract?.[0];
        const paramValue = contract?.parameter?.value;
        const contractType = contract?.type;

        // Extract value - for TRC-20 (TriggerSmartContract), decode from data field
        let value = "0";
        let to = paramValue?.toAddressBase58 || paramValue?.to_address;

        if (contractType === "TriggerSmartContract" && paramValue?.data) {
          // TRC-20 transfer: method signature (8 chars) + to address (64 chars) + amount (64 chars)
          const data = paramValue.data;
          if (data.startsWith("a9059cbb")) {
            // transfer(address,uint256)
            // Extract amount from last 64 chars (hex)
            const amountHex = data.slice(-64);
            try {
              value = BigInt("0x" + amountHex).toString();
            } catch {
              value = "0";
            }
            // Extract to address from middle 64 chars
            const toAddressHex = data.slice(8, 72).slice(-40);
            // Note: This is hex address, the Base58 version may be in paramValue
          }
        } else if (contractType === "TransferContract") {
          // Native TRX transfer
          value = String(paramValue?.amount || 0);
        }

        return {
          hash: (tx.txID || tx.hash) as string,
          from: paramValue?.ownerAddressBase58 || paramValue?.owner_address,
          to: to,
          value: value,
          timestamp: rawData.timestamp
            ? Math.floor((rawData.timestamp as number) / 1000)
            : Math.floor(Date.now() / 1000),
          status:
            (tx.ret as Array<{ contractRet?: string }>)?.[0]?.contractRet ===
            "SUCCESS"
              ? "confirmed"
              : "failed",
          blockNumber: tx.blockNumber as number,
          contractType: contractType,
          contractAddress: paramValue?.contract_address,
        };
      }

      // Standard EVM/Bitcoin transaction format
      return {
        hash: tx.hash || tx.txId || tx.signature || tx.txID,
        from:
          tx.from ||
          tx.ownerAddress ||
          (tx.inputs as Array<{ address?: string }>)?.[0]?.address,
        to:
          tx.to ||
          tx.toAddress ||
          (tx.outputs as Array<{ address?: string }>)?.[0]?.address,
        value: tx.value || tx.amount,
        timestamp: tx.timestamp || tx.blockTime || tx.block_timestamp,
        status: tx.status || "confirmed",
        blockNumber: tx.blockNumber || tx.blockHeight,
      };
    });

    if (chain === "tron") {
      const incoming = await fetchTronGridTrc20Incoming(address, testnet);
      const incomingTx = incoming
        .map((t) => {
          const hash = t.transaction_id;
          if (!hash) return null;
          return {
            hash,
            from: t.from || "",
            to: t.to || "",
            value: t.value || "0",
            timestamp: t.block_timestamp
              ? Math.floor(t.block_timestamp / 1000)
              : Math.floor(Date.now() / 1000),
            status: "confirmed",
            contractType: "TriggerSmartContract",
            contractAddressBase58: t.token_info?.address,
            contractAddress: t.token_info?.address,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      const uniq = new Map<string, any>();
      for (const t of [...parsedTransactions, ...incomingTx]) {
        if (!t) continue;
        const h = String((t as any).hash || "");
        if (!h) continue;
        uniq.set(h, t);
      }
      parsedTransactions = Array.from(uniq.values()).sort(
        (a, b) =>
          Number((b as any).timestamp || 0) - Number((a as any).timestamp || 0),
      );
    }

    // Arbitrum: merge ERC-20 token transfers from Arbiscan
    if (chain === "arbitrum" && !testnet) {
      const tokenTxs = await fetchArbitrumTokenTransfers(address);
      const uniq = new Map<string, any>();
      for (const t of [...parsedTransactions, ...tokenTxs]) {
        if (!t) continue;
        const h = String((t as any).hash || "");
        if (!h) continue;
        // Token transfers have more info, prefer them over native-only entries
        if (!uniq.has(h) || (t as any).tokenSymbol) uniq.set(h, t);
      }
      parsedTransactions = Array.from(uniq.values()).sort(
        (a, b) => Number((b as any).timestamp || 0) - Number((a as any).timestamp || 0),
      );
    }

    return {
      chain,
      transactions: parsedTransactions,
      explorerUrl: config.explorerUrl(testnet),
    };
  } catch (error) {
    console.error(`Error fetching ${chain} transactions:`, error);
    return {
      chain,
      transactions: [],
      explorerUrl: config.explorerUrl(testnet),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function estimateGas(chain: Chain, testnet: boolean = true) {
  const config = chainConfigs[chain];

  // Tron doesn't have a fee estimation endpoint, return static values
  if (chain === "tron") {
    console.log("Returning static Tron fee estimates");
    return {
      chain,
      slow: { fee: "1", estimatedTime: 60 },
      medium: { fee: "5", estimatedTime: 30 },
      fast: { fee: "10", estimatedTime: 10 },
      unit: "TRX",
    };
  }

  // Solana fee estimation via Helius
  if (chain === "solana") {
    try {
      console.log("Fetching Solana fee estimate via Helius RPC");
      const result = await heliusRpcRequest(
        "getRecentPrioritizationFees",
        [[]],
        testnet,
      );

      // Get the average of recent priority fees
      if (result && result.length > 0) {
        const fees = result.map(
          (f: { prioritizationFee: number }) => f.prioritizationFee,
        );
        const avgFee = Math.floor(
          fees.reduce((a: number, b: number) => a + b, 0) / fees.length,
        );
        const maxFee = Math.max(...fees);

        return {
          chain,
          slow: { fee: String(Math.max(5000, avgFee)), estimatedTime: 60 },
          medium: {
            fee: String(Math.max(10000, avgFee * 2)),
            estimatedTime: 30,
          },
          fast: { fee: String(Math.max(25000, maxFee)), estimatedTime: 10 },
          unit: "lamports",
        };
      }
    } catch (error) {
      console.error("Error fetching Solana fee estimate:", error);
    }

    // Fallback static values
    return {
      chain,
      slow: { fee: "5000", estimatedTime: 60 },
      medium: { fee: "10000", estimatedTime: 30 },
      fast: { fee: "25000", estimatedTime: 10 },
      unit: "lamports",
    };
  }

  try {
    const endpoint = config.gasEndpoint(testnet);
    const gasData = await tatumRequest(endpoint);
    console.log(`${chain} gas estimate response:`, JSON.stringify(gasData));

    if (chain === "bitcoin") {
      return {
        chain,
        slow: { fee: gasData.slow || "10", estimatedTime: 3600 },
        medium: { fee: gasData.medium || "20", estimatedTime: 1800 },
        fast: { fee: gasData.fast || "50", estimatedTime: 600 },
        unit: "sat/byte",
      };
    } else {
      // Ethereum/Polygon return gas price in gwei
      return {
        chain,
        slow: {
          gasPrice: gasData.slow?.gasPrice || gasData.safeLow || "10",
          estimatedTime: 300,
        },
        medium: {
          gasPrice: gasData.standard?.gasPrice || gasData.average || "20",
          estimatedTime: 60,
        },
        fast: {
          gasPrice: gasData.fast?.gasPrice || gasData.fastest || "30",
          estimatedTime: 15,
        },
        baseFee: gasData.baseFee,
        unit: "gwei",
      };
    }
  } catch (error) {
    console.error(`Error estimating ${chain} gas:`, error);
    if (chain === "bitcoin") {
      return {
        chain,
        slow: { fee: "10", estimatedTime: 3600 },
        medium: { fee: "20", estimatedTime: 1800 },
        fast: { fee: "50", estimatedTime: 600 },
        unit: "sat/byte",
      };
    } else {
      return {
        chain,
        slow: { gasPrice: "10", estimatedTime: 300 },
        medium: { gasPrice: "20", estimatedTime: 60 },
        fast: { gasPrice: "30", estimatedTime: 15 },
        unit: "gwei",
      };
    }
  }
}

// CoinGecko ID mapping for symbols
const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  MATIC: "matic-network",
  TRX: "tron",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  WETH: "weth",
  WBTC: "wrapped-bitcoin",
  WMATIC: "wmatic",
  BTT: "bittorrent",
  JST: "just",
  SUN: "sun-token",
  WIN: "wink",
};

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

async function getPrices(
  symbols: string[] = ["ETH", "BTC", "SOL", "MATIC", "TRX"],
): Promise<PriceData[]> {
  try {
    const ids = symbols
      .map((s) => COINGECKO_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(",");

    if (!ids) {
      console.log("No valid symbols to fetch prices for");
      return symbols.map((s) => ({
        symbol: s,
        price: 0,
        change24h: 0,
        lastUpdated: new Date().toISOString(),
      }));
    }

    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
    console.log(`Fetching prices from CoinGecko: ${url}`);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status} - ${errorText}`);
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("CoinGecko response:", JSON.stringify(data));

    const prices: PriceData[] = symbols.map((symbol) => {
      const geckoId = COINGECKO_IDS[symbol.toUpperCase()];
      const priceData = geckoId ? data[geckoId] : null;

      return {
        symbol: symbol.toUpperCase(),
        price: priceData?.usd || 0,
        change24h: priceData?.usd_24h_change || 0,
        marketCap: priceData?.usd_market_cap,
        volume24h: priceData?.usd_24h_vol,
        lastUpdated: new Date().toISOString(),
      };
    });

    return prices;
  } catch (error) {
    console.error("Error fetching prices:", error);
    return symbols.map((symbol) => ({
      symbol: symbol.toUpperCase(),
      price: 0,
      change24h: 0,
      lastUpdated: new Date().toISOString(),
    }));
  }
}

// Broadcast a signed transaction to the blockchain
async function broadcastTransaction(
  chain: Chain,
  signedTransaction: string,
  testnet: boolean = false,
): Promise<{ txHash: string; explorerUrl: string }> {
  const config = chainConfigs[chain];

  if (!signedTransaction) {
    throw new Error("Signed transaction hex is required");
  }

  console.log(`Broadcasting ${chain} transaction (testnet: ${testnet})`);

  // Solana broadcast via Helius
  if (chain === "solana") {
    try {
      console.log(`Broadcasting Solana transaction via Helius RPC`);

      // Convert hex to base64 if needed (client sends hex, Helius expects base64)
      let base64Tx = signedTransaction;
      if (/^[0-9a-fA-F]+$/.test(signedTransaction)) {
        // It's hex-encoded, convert to base64
        const bytes = new Uint8Array(
          signedTransaction.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)),
        );
        base64Tx = btoa(String.fromCharCode(...bytes));
      }

      const result = await heliusRpcRequest(
        "sendTransaction",
        [
          base64Tx,
          {
            encoding: "base64",
            skipPreflight: true,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          },
        ],
        testnet,
      );

      const txHash = result;
      console.log(`Helius Solana broadcast result: ${txHash}`);

      if (!txHash) {
        throw new Error("Failed to get transaction signature from Helius");
      }

      const explorerUrl = `${config.explorerUrl(testnet)}/tx/${txHash}${testnet ? "?cluster=devnet" : ""}`;

      return { txHash, explorerUrl };
    } catch (error) {
      console.error("Error broadcasting Solana transaction via Helius:", error);
      throw error;
    }
  }

  // Other chains use Tatum
  let endpoint: string;
  let body: object;

  switch (chain) {
    case "ethereum":
      endpoint = `/ethereum/broadcast${testnet ? "?testnet=true" : ""}`;
      body = { txData: signedTransaction };
      break;
    case "polygon":
      endpoint = `/polygon/broadcast${testnet ? "?testnet=true" : ""}`;
      body = { txData: signedTransaction };
      break;
    case "bitcoin":
      endpoint = `/bitcoin/broadcast${testnet ? "?testnet=true" : ""}`;
      body = { txData: signedTransaction };
      break;
    case "tron":
      endpoint = `/tron/broadcast`;
      body = { txData: signedTransaction };
      break;
    default:
      throw new Error(`Unsupported chain for broadcast: ${chain}`);
  }

  const result = await tatumRequest(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log(`${chain} broadcast response:`, JSON.stringify(result));

  const txHash = result.txId || result.txHash || result.signatureId || result;

  if (!txHash) {
    throw new Error("Failed to get transaction hash from broadcast response");
  }

  const explorerBase = config.explorerUrl(testnet);
  let explorerUrl: string;

  switch (chain) {
    case "bitcoin":
      explorerUrl = `${explorerBase}/tx/${txHash}`;
      break;
    case "tron":
      explorerUrl = `${explorerBase}/#/transaction/${txHash}`;
      break;
    default:
      explorerUrl = `${explorerBase}/tx/${txHash}`;
  }

  return {
    txHash: typeof txHash === "string" ? txHash : JSON.stringify(txHash),
    explorerUrl,
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: WalletBalanceRequest = await req.json();
    const {
      action,
      chain,
      address,
      testnet = true,
      symbols,
      signedTransaction,
      rpcMethod,
      rpcParams,
    } = body;

    console.log(
      `Processing ${action} for ${chain} address: ${address}, testnet: ${testnet}`,
    );

    let result;

    switch (action) {
      case "getBalance":
        // Check API keys based on chain
        if (chain === "solana") {
          if (!HELIUS_API_KEY) {
            throw new Error("HELIUS_API_KEY is not configured");
          }
        } else {
          if (!TATUM_API_KEY) {
            throw new Error("TATUM_API_KEY is not configured");
          }
        }
        if (!address) {
          throw new Error("Address is required for getBalance");
        }
        if (!chainConfigs[chain]) {
          throw new Error(
            `Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(", ")}`,
          );
        }
        result = await getBalance(chain, address, testnet);
        break;

      case "getTransactions":
        if (chain === "solana") {
          if (!HELIUS_API_KEY) {
            throw new Error("HELIUS_API_KEY is not configured");
          }
        } else {
          if (!TATUM_API_KEY) {
            throw new Error("TATUM_API_KEY is not configured");
          }
        }
        if (!address) {
          throw new Error("Address is required for getTransactions");
        }
        if (!chainConfigs[chain]) {
          throw new Error(
            `Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(", ")}`,
          );
        }
        result = await getTransactions(chain, address, testnet);
        break;

      case "estimateGas":
        if (chain === "solana") {
          if (!HELIUS_API_KEY) {
            throw new Error("HELIUS_API_KEY is not configured");
          }
        } else if (chain !== "tron") {
          if (!TATUM_API_KEY) {
            throw new Error("TATUM_API_KEY is not configured");
          }
        }
        if (!chainConfigs[chain]) {
          throw new Error(
            `Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(", ")}`,
          );
        }
        result = await estimateGas(chain, testnet);
        break;

      case "getPrices":
        result = await getPrices(
          symbols || ["ETH", "BTC", "SOL", "MATIC", "TRX"],
        );
        break;

      case "broadcastTransaction":
        if (chain === "solana") {
          if (!HELIUS_API_KEY) {
            throw new Error("HELIUS_API_KEY is not configured");
          }
        } else {
          if (!TATUM_API_KEY) {
            throw new Error("TATUM_API_KEY is not configured");
          }
        }
        if (!signedTransaction) {
          throw new Error(
            "Signed transaction is required for broadcastTransaction",
          );
        }
        if (!chainConfigs[chain]) {
          throw new Error(
            `Unsupported chain: ${chain}. Supported chains: ${Object.keys(chainConfigs).join(", ")}`,
          );
        }
        result = await broadcastTransaction(chain, signedTransaction, testnet);
        break;

      case "solanaRpc":
        if (chain !== "solana") {
          throw new Error("solanaRpc action only supports chain=solana");
        }
        if (!HELIUS_API_KEY) {
          throw new Error("HELIUS_API_KEY is not configured");
        }
        if (!rpcMethod) {
          throw new Error("rpcMethod is required for solanaRpc");
        }
        result = await heliusRpcRequest(rpcMethod, rpcParams || [], testnet);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

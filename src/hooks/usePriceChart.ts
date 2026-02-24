import { useQuery } from "@tanstack/react-query";

export type TimeRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

interface ChartPoint {
  time: number; // unix ms
  price: number;
}

const COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  BTC: "bitcoin",
  SOL: "solana",
  MATIC: "matic-network",
  POL: "matic-network",
  TRX: "tron",
  USDC: "usd-coin",
  USDT: "tether",
  BNB: "binancecoin",
  LINK: "chainlink",
  UNI: "uniswap",
  AAVE: "aave",
  ARB: "arbitrum",
  OP: "optimism",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  ADA: "cardano",
  XRP: "ripple",
  BONK: "bonk",
  WIF: "dogwifcoin",
  JUP: "jupiter-exchange-solana",
  RAY: "raydium",
};

const RANGE_CONFIG: Record<TimeRange, { days: string; interval?: string }> = {
  "1D": { days: "1" },
  "1W": { days: "7" },
  "1M": { days: "30", interval: "daily" },
  "3M": { days: "90", interval: "daily" },
  "1Y": { days: "365", interval: "daily" },
  ALL: { days: "max", interval: "weekly" },
};

async function fetchChartData(symbol: string, range: TimeRange): Promise<ChartPoint[]> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()];
  if (!coinId) return [];

  const config = RANGE_CONFIG[range];
  let url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}`;
  if (config.interval) url += `&interval=${config.interval}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`CoinGecko error: ${resp.status}`);

  const data = await resp.json();
  const prices: [number, number][] = data.prices || [];

  return prices.map(([time, price]) => ({ time, price }));
}

export function usePriceChart(symbol: string, range: TimeRange = "1D") {
  return useQuery({
    queryKey: ["priceChart", symbol, range],
    queryFn: () => fetchChartData(symbol, range),
    staleTime: range === "1D" ? 2 * 60 * 1000 : 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

import { useQuery } from '@tanstack/react-query';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

// Mock prices - backend removed
const MOCK_PRICES: Record<string, { price: number; change24h: number }> = {
  ETH: { price: 3200, change24h: 2.5 },
  BTC: { price: 65000, change24h: 1.2 },
  SOL: { price: 145, change24h: 3.8 },
  MATIC: { price: 0.85, change24h: -1.5 },
  POL: { price: 0.85, change24h: -1.5 },
  TRX: { price: 0.12, change24h: 0.8 },
  USDC: { price: 1.0, change24h: 0 },
  USDT: { price: 1.0, change24h: 0 },
  LINK: { price: 14.5, change24h: 2.1 },
  DAI: { price: 1.0, change24h: 0 },
};

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  // Return mock prices since backend is removed
  return symbols.map(symbol => {
    const mock = MOCK_PRICES[symbol.toUpperCase()] || { price: 0, change24h: 0 };
    return {
      symbol: symbol.toUpperCase(),
      price: mock.price,
      change24h: mock.change24h,
      lastUpdated: new Date().toISOString(),
    };
  });
}

export function useCryptoPrices(symbols: string[] = ['ETH', 'BTC', 'SOL', 'MATIC', 'TRX', 'USDC', 'USDT', 'LINK']) {
  return useQuery({
    queryKey: ['cryptoPrices', symbols.join(',')],
    queryFn: () => fetchPrices(symbols),
    staleTime: 60000, // 1 minute
    refetchInterval: 120000, // 2 minutes
  });
}

// Helper to get price for a specific symbol from the prices array
export function getPriceForSymbol(prices: PriceData[] | undefined, symbol: string): number {
  if (!prices) return 0;
  const priceData = prices.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  return priceData?.price || 0;
}

// Helper to get 24h change for a specific symbol
export function getChangeForSymbol(prices: PriceData[] | undefined, symbol: string): number {
  if (!prices) return 0;
  const priceData = prices.find(p => p.symbol.toUpperCase() === symbol.toUpperCase());
  return priceData?.change24h || 0;
}

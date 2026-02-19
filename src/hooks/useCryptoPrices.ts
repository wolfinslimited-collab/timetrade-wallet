import { invokeBlockchain } from '@/lib/blockchain';
import { useQuery } from '@tanstack/react-query';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: string;
}

interface PricesResponse {
  success: boolean;
  data?: PriceData[];
  error?: string;
}

async function fetchPrices(symbols: string[]): Promise<PriceData[]> {
  const { data, error } = await invokeBlockchain({ 
    action: 'getPrices', 
    chain: 'ethereum', // Not used for prices but required by the type
    address: '',
    symbols,
  });

  if (error) {
    console.error('Price fetch error:', error);
    throw new Error(error.message || 'Failed to fetch prices');
  }

  const response = data as PricesResponse;
  
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }

  return response.data || [];
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

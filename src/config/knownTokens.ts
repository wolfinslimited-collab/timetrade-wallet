// Known SPL token mint addresses → symbol + decimals
export const KNOWN_SPL: Record<string, { symbol: string; decimals: number }> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', decimals: 6 },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', decimals: 6 },
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', decimals: 9 },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', decimals: 9 },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', decimals: 5 },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', decimals: 9 },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', decimals: 6 },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', decimals: 6 },
};

/**
 * Resolve the display symbol and decimals for a Solana token transfer.
 * Falls back to transfer metadata, then defaults.
 */
export function resolveSplToken(mint?: string | null, transferSymbol?: string, transferDecimals?: number) {
  if (mint && KNOWN_SPL[mint]) {
    return KNOWN_SPL[mint];
  }
  if (transferSymbol && transferSymbol !== 'Unknown') {
    return { symbol: transferSymbol, decimals: transferDecimals ?? 6 };
  }
  return null;
}
import { useCallback, useState } from 'react';
import { invokeBlockchain } from '@/lib/blockchain';
import { 
  SolanaDerivationPath, 
  SOLANA_DERIVATION_PATHS,
  deriveSolanaAddress 
} from '@/utils/walletDerivation';

interface PathBalanceResult {
  path: SolanaDerivationPath;
  address: string;
  balance: string;
  hasBalance: boolean;
}

interface DetectionResult {
  detectedPath: SolanaDerivationPath;
  address: string;
  results: PathBalanceResult[];
}

export function useSolanaPathDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const detectPath = useCallback(async (mnemonic: string): Promise<DetectionResult | null> => {
    setIsDetecting(true);
    setError(null);

    try {
      // Derive addresses for all three paths at account index 0
      const pathStyles: SolanaDerivationPath[] = ['phantom', 'solflare', 'legacy'];
      const addresses: { path: SolanaDerivationPath; address: string; fullPath: string }[] = [];

      for (const pathStyle of pathStyles) {
        const address = deriveSolanaAddress(mnemonic, 0, pathStyle);
        const pathConfig = SOLANA_DERIVATION_PATHS[pathStyle];
        addresses.push({
          path: pathStyle,
          address,
          fullPath: pathConfig.getPath(0),
        });
      }

      console.log('Checking Solana balances for derivation paths:', addresses);

      // Check balances for all addresses in parallel
      const balancePromises = addresses.map(async ({ path, address }) => {
        try {
          const { data, error } = await invokeBlockchain({ 
            action: 'getBalance', 
            chain: 'solana', 
            address, 
            testnet: false 
          });

          if (error) {
            console.error(`Error checking balance for ${path}:`, error);
            return { path, address, balance: '0', hasBalance: false };
          }

          const nativeBalance = data?.data?.native?.balance || '0';
          const tokens = data?.data?.tokens || [];
          
          // Check if there's any native balance or tokens
          const hasNativeBalance = nativeBalance !== '0' && parseFloat(nativeBalance) > 0;
          const hasTokens = tokens.length > 0;
          const hasBalance = hasNativeBalance || hasTokens;

          console.log(`Path ${path} (${address}): native=${nativeBalance}, tokens=${tokens.length}, hasBalance=${hasBalance}`);

          return { 
            path, 
            address, 
            balance: nativeBalance, 
            hasBalance 
          };
        } catch (err) {
          console.error(`Error checking balance for ${path}:`, err);
          return { path, address, balance: '0', hasBalance: false };
        }
      });

      const results = await Promise.all(balancePromises);

      // Find the first path with a balance
      const pathWithBalance = results.find(r => r.hasBalance);

      // If we found a path with balance, use it; otherwise default to legacy (Trust Wallet compatible)
      const detectedPath = pathWithBalance?.path || 'legacy';
      const detectedAddress = pathWithBalance?.address || addresses.find(a => a.path === 'legacy')!.address;

      console.log(`Detected Solana derivation path: ${detectedPath} (${detectedAddress})`);

      return {
        detectedPath,
        address: detectedAddress,
        results,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to detect Solana path');
      setError(error);
      console.error('Solana path detection error:', error);
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const savePathPreference = useCallback((path: SolanaDerivationPath) => {
    localStorage.setItem('timetrade_solana_derivation_path', path);
    console.log(`Saved Solana derivation path preference: ${path}`);
  }, []);

  return {
    detectPath,
    savePathPreference,
    isDetecting,
    error,
  };
}

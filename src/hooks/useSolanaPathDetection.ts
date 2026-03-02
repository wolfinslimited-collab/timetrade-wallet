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
          
          const hasNativeBalance = nativeBalance !== '0' && parseFloat(nativeBalance) > 0;
          const hasTokens = tokens.length > 0;
          const hasBalance = hasNativeBalance || hasTokens;

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

      const pathWithBalance = results.find(r => r.hasBalance);

      const detectedPath = pathWithBalance?.path || 'legacy';
      const detectedAddress = pathWithBalance?.address || addresses.find(a => a.path === 'legacy')!.address;

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
  }, []);

  return {
    detectPath,
    savePathPreference,
    isDetecting,
    error,
  };
}
import { useCallback, useState } from 'react';
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

      console.log('Derived Solana addresses for all paths:', addresses);

      // Backend removed - cannot check balances, default to phantom path
      const results: PathBalanceResult[] = addresses.map(({ path, address }) => ({
        path,
        address,
        balance: '0',
        hasBalance: false,
      }));

      // Default to phantom (most common)
      const detectedPath: SolanaDerivationPath = 'phantom';
      const detectedAddress = addresses.find(a => a.path === 'phantom')!.address;

      console.log(`Using default Solana derivation path: ${detectedPath} (${detectedAddress})`);

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

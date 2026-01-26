import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { Chain } from './useBlockchain';
import { getRpcUrl, isEvmChain } from './useTransactionSigning';

export interface LiveFeeData {
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  gasPrice: bigint | null;
  baseFeePerGas: bigint | null;
  // Formatted values in Gwei
  maxFeePerGasGwei: number;
  maxPriorityFeePerGasGwei: number;
  gasPriceGwei: number;
  baseFeePerGasGwei: number;
  // Estimated tiers
  slow: { gasPrice: number; maxFee: number; priorityFee: number; estimatedTime: number };
  standard: { gasPrice: number; maxFee: number; priorityFee: number; estimatedTime: number };
  fast: { gasPrice: number; maxFee: number; priorityFee: number; estimatedTime: number };
  instant: { gasPrice: number; maxFee: number; priorityFee: number; estimatedTime: number };
  // Metadata
  lastUpdated: Date;
  isEIP1559: boolean;
}

interface UseLiveFeeEstimationReturn {
  feeData: LiveFeeData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  isLive: boolean;
}

const REFRESH_INTERVAL = 12000; // 12 seconds (block time)

// Convert wei to gwei
function weiToGwei(wei: bigint | null): number {
  if (!wei) return 0;
  return Number(ethers.formatUnits(wei, 'gwei'));
}

export function useLiveFeeEstimation(
  chain: Chain,
  isTestnet: boolean = true,
  enabled: boolean = true
): UseLiveFeeEstimationReturn {
  const [feeData, setFeeData] = useState<LiveFeeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<ethers.JsonRpcProvider | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchFeeData = useCallback(async () => {
    if (!isEvmChain(chain) || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rpcUrl = getRpcUrl(chain, isTestnet);
      
      // Reuse provider if same chain
      if (!providerRef.current || providerRef.current._getConnection().url !== rpcUrl) {
        providerRef.current = new ethers.JsonRpcProvider(rpcUrl);
      }
      
      const provider = providerRef.current;
      
      // Fetch fee data from the network
      const networkFeeData = await provider.getFeeData();
      
      // Get the latest block to check for EIP-1559 support
      const block = await provider.getBlock('latest');
      const baseFeePerGas = block?.baseFeePerGas || null;
      const isEIP1559 = baseFeePerGas !== null;

      // Convert to gwei for display
      const maxFeeGwei = weiToGwei(networkFeeData.maxFeePerGas);
      const priorityFeeGwei = weiToGwei(networkFeeData.maxPriorityFeePerGas);
      const gasPriceGwei = weiToGwei(networkFeeData.gasPrice);
      const baseFeeGwei = weiToGwei(baseFeePerGas);

      // Calculate tiers based on current network conditions
      // For EIP-1559, we adjust the priority fee to create different speeds
      const baseGas = isEIP1559 ? baseFeeGwei : gasPriceGwei;
      const basePriority = priorityFeeGwei || baseGas * 0.1;

      const tiers = {
        slow: {
          gasPrice: baseGas * 0.85,
          maxFee: isEIP1559 ? baseFeeGwei + basePriority * 0.5 : baseGas * 0.85,
          priorityFee: basePriority * 0.5,
          estimatedTime: 180, // ~3 minutes
        },
        standard: {
          gasPrice: baseGas,
          maxFee: isEIP1559 ? baseFeeGwei + basePriority : baseGas,
          priorityFee: basePriority,
          estimatedTime: 60, // ~1 minute
        },
        fast: {
          gasPrice: baseGas * 1.25,
          maxFee: isEIP1559 ? baseFeeGwei * 1.25 + basePriority * 1.5 : baseGas * 1.25,
          priorityFee: basePriority * 1.5,
          estimatedTime: 15, // ~15 seconds
        },
        instant: {
          gasPrice: baseGas * 1.5,
          maxFee: isEIP1559 ? baseFeeGwei * 1.5 + basePriority * 2 : baseGas * 1.5,
          priorityFee: basePriority * 2,
          estimatedTime: 5, // ~5 seconds
        },
      };

      setFeeData({
        maxFeePerGas: networkFeeData.maxFeePerGas,
        maxPriorityFeePerGas: networkFeeData.maxPriorityFeePerGas,
        gasPrice: networkFeeData.gasPrice,
        baseFeePerGas,
        maxFeePerGasGwei: maxFeeGwei,
        maxPriorityFeePerGasGwei: priorityFeeGwei,
        gasPriceGwei,
        baseFeePerGasGwei: baseFeeGwei,
        slow: tiers.slow,
        standard: tiers.standard,
        fast: tiers.fast,
        instant: tiers.instant,
        lastUpdated: new Date(),
        isEIP1559,
      });
    } catch (err) {
      console.error('Failed to fetch live fee data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch fee data');
    } finally {
      setIsLoading(false);
    }
  }, [chain, isTestnet, enabled]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (!isEvmChain(chain) || !enabled) {
      setFeeData(null);
      return;
    }

    // Initial fetch
    fetchFeeData();

    // Set up periodic refresh
    intervalRef.current = setInterval(fetchFeeData, REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [chain, isTestnet, enabled, fetchFeeData]);

  // Cleanup provider on unmount
  useEffect(() => {
    return () => {
      providerRef.current = null;
    };
  }, []);

  return {
    feeData,
    isLoading,
    error,
    refresh: fetchFeeData,
    isLive: feeData !== null && !error,
  };
}

// Helper to get the appropriate fee for a speed tier
export function getFeeForSpeed(
  feeData: LiveFeeData | null,
  speed: 'slow' | 'standard' | 'fast' | 'instant'
): { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint } | null {
  if (!feeData) return null;

  const tier = feeData[speed];
  
  if (feeData.isEIP1559) {
    return {
      maxFeePerGas: ethers.parseUnits(tier.maxFee.toFixed(9), 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits(tier.priorityFee.toFixed(9), 'gwei'),
    };
  }

  // For legacy transactions
  return {
    maxFeePerGas: ethers.parseUnits(tier.gasPrice.toFixed(9), 'gwei'),
    maxPriorityFeePerGas: BigInt(0),
  };
}

// Calculate total fee in native token
export function calculateTotalFee(
  gasLimit: number,
  gasPriceGwei: number
): { eth: number; gwei: number } {
  const eth = (gasPriceGwei * gasLimit) / 1e9;
  return { eth, gwei: gasPriceGwei };
}

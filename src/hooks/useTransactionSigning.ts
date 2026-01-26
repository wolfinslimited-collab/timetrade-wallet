import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { Chain, getChainInfo } from './useBlockchain';

export interface TransactionParams {
  to: string;
  value: string; // Amount in ether (e.g., "0.1")
  gasLimit?: bigint;
  gasPrice?: string; // In gwei (legacy)
  maxFeePerGas?: string; // In gwei (EIP-1559)
  maxPriorityFeePerGas?: string; // In gwei (EIP-1559)
  data?: string;
  chainId?: number;
}

export interface SignedTransaction {
  signedTx: string;
  txHash: string;
}

interface UseTransactionSigningReturn {
  signTransaction: (privateKey: string, params: TransactionParams) => Promise<SignedTransaction>;
  isSigningAvailable: boolean;
  error: string | null;
  clearError: () => void;
}

// Chain IDs for supported networks
const CHAIN_IDS: Record<Chain, { mainnet: number; testnet: number }> = {
  ethereum: { mainnet: 1, testnet: 11155111 }, // Sepolia
  polygon: { mainnet: 137, testnet: 80002 }, // Amoy
  bitcoin: { mainnet: 0, testnet: 0 }, // Not EVM
  solana: { mainnet: 0, testnet: 0 }, // Not EVM
};

// RPC URLs for different chains
const RPC_URLS: Record<Chain, { mainnet: string; testnet: string }> = {
  ethereum: {
    mainnet: 'https://eth.llamarpc.com',
    testnet: 'https://rpc.sepolia.org',
  },
  polygon: {
    mainnet: 'https://polygon-rpc.com',
    testnet: 'https://rpc-amoy.polygon.technology',
  },
  bitcoin: { mainnet: '', testnet: '' },
  solana: { mainnet: '', testnet: '' },
};

export function getChainId(chain: Chain, isTestnet: boolean): number {
  const chainIds = CHAIN_IDS[chain];
  return isTestnet ? chainIds.testnet : chainIds.mainnet;
}

export function getRpcUrl(chain: Chain, isTestnet: boolean): string {
  const urls = RPC_URLS[chain];
  return isTestnet ? urls.testnet : urls.mainnet;
}

export function isEvmChain(chain: Chain): boolean {
  return chain === 'ethereum' || chain === 'polygon';
}

export function useTransactionSigning(chain: Chain, isTestnet: boolean = true): UseTransactionSigningReturn {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const signTransaction = useCallback(async (
    privateKey: string,
    params: TransactionParams
  ): Promise<SignedTransaction> => {
    try {
      setError(null);

      if (!isEvmChain(chain)) {
        throw new Error(`Transaction signing for ${chain} is not yet supported. Only Ethereum and Polygon are available.`);
      }

      // Validate private key format
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }

      if (privateKey.length !== 66) {
        throw new Error('Invalid private key format');
      }

      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);

      // Get chain info
      const chainInfo = getChainInfo(chain);
      const chainId = getChainId(chain, isTestnet);
      const rpcUrl = getRpcUrl(chain, isTestnet);

      // Create provider for nonce lookup
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const walletWithProvider = wallet.connect(provider);

      // Get current nonce
      const nonce = await provider.getTransactionCount(wallet.address, 'pending');

      // Parse value to wei
      const valueWei = ethers.parseEther(params.value);

      // Build transaction
      const tx: ethers.TransactionRequest = {
        to: params.to,
        value: valueWei,
        nonce,
        chainId,
        gasLimit: params.gasLimit || BigInt(21000), // Default for simple transfer
        type: 2, // EIP-1559 transaction
      };

      // Get fee data from provider or use provided values
      const feeData = await provider.getFeeData();
      
      // Use EIP-1559 if provided, otherwise fall back to legacy
      if (params.maxFeePerGas && params.maxPriorityFeePerGas) {
        // Use provided EIP-1559 fees
        tx.maxFeePerGas = ethers.parseUnits(params.maxFeePerGas, 'gwei');
        tx.maxPriorityFeePerGas = ethers.parseUnits(params.maxPriorityFeePerGas, 'gwei');
        console.log('Using provided EIP-1559 fees:', { 
          maxFeePerGas: params.maxFeePerGas, 
          maxPriorityFeePerGas: params.maxPriorityFeePerGas 
        });
      } else if (params.gasPrice) {
        // Use legacy gas price converted to EIP-1559 format
        const gasPriceWei = ethers.parseUnits(params.gasPrice, 'gwei');
        tx.maxFeePerGas = gasPriceWei;
        tx.maxPriorityFeePerGas = gasPriceWei / BigInt(2);
        console.log('Using legacy gas price as EIP-1559:', { gasPrice: params.gasPrice });
      } else if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // Use network fee data
        tx.maxFeePerGas = feeData.maxFeePerGas;
        tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        console.log('Using network fee data');
      } else {
        // Fallback to legacy gas price
        tx.gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
        delete tx.maxFeePerGas;
        delete tx.maxPriorityFeePerGas;
        tx.type = 0;
        console.log('Using legacy transaction type');
      }

      // Add data if provided (for contract interactions)
      if (params.data) {
        tx.data = params.data;
      }

      // Sign the transaction
      const signedTx = await walletWithProvider.signTransaction(tx);
      
      // Compute transaction hash
      const txHash = ethers.keccak256(signedTx);

      console.log('Transaction signed successfully:', { txHash, chainId, nonce });

      return {
        signedTx,
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign transaction';
      setError(message);
      throw err;
    }
  }, [chain, isTestnet]);

  return {
    signTransaction,
    isSigningAvailable: isEvmChain(chain),
    error,
    clearError,
  };
}

// Utility to derive address from private key
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    if (!privateKey.startsWith('0x')) {
      privateKey = '0x' + privateKey;
    }
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    throw new Error('Invalid private key');
  }
}

// Utility to validate Ethereum address
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

// Utility to format gas price for display
export function formatGasPrice(gasPriceGwei: string): string {
  const gwei = parseFloat(gasPriceGwei);
  if (gwei < 1) return gwei.toFixed(2) + ' Gwei';
  return Math.round(gwei) + ' Gwei';
}

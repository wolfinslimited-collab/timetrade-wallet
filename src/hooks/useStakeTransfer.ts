/**
 * Hook to perform a real on-chain transfer of tokens to the platform staking wallet.
 * Used by the staking flow to move user funds before recording the stake position.
 */
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { supabase } from '@/integrations/supabase/client';
import { Chain } from '@/hooks/useBlockchain';
import { useBroadcastTransaction } from '@/hooks/useTransactionBroadcast';
import { decryptPrivateKey, EncryptedData } from '@/utils/encryption';
import { derivePrivateKeyForChain, SolanaDerivationPath } from '@/utils/walletDerivation';
import { WALLET_STORAGE_KEYS } from '@/utils/walletStorage';
import { useTransactionSigning, getRpcUrl, getChainId } from '@/hooks/useTransactionSigning';
import { useTronTransactionSigning } from '@/hooks/useTronTransactionSigning';
import { useSolanaTransactionSigning } from '@/hooks/useSolanaTransactionSigning';

// ERC-20 transfer function signature
const ERC20_TRANSFER_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

export interface StakeTransferParams {
  chain: Chain;
  tokenSymbol: string;
  amount: string; // human-readable amount (e.g. "100")
  contractAddress?: string; // for tokens
  decimals: number;
  isNative: boolean;
}

export interface StakeTransferResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Fetch the platform staking wallet address for a given chain from the database.
 */
export async function getStakeWalletAddress(chain: Chain): Promise<string | null> {
  const { data, error } = await supabase
    .from('stake_wallets')
    .select('wallet_address')
    .eq('chain', chain)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[STAKE TRANSFER] Error fetching stake wallet:', error);
    return null;
  }

  if (!data || !data.wallet_address || data.wallet_address.trim() === '') {
    console.warn(`[STAKE TRANSFER] No stake wallet configured for chain: ${chain}`);
    return null;
  }

  return data.wallet_address;
}

export function useStakeTransfer() {
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const broadcastMutation = useBroadcastTransaction();
  const { signTransaction: signEvmTx } = useTransactionSigning('ethereum', false);
  const { signTransaction: signTronTx } = useTronTransactionSigning(false);
  const { signTransaction: signSolanaTx } = useSolanaTransactionSigning(false);

  const transfer = useCallback(async (
    pin: string,
    params: StakeTransferParams
  ): Promise<StakeTransferResult> => {
    setIsTransferring(true);
    setError(null);

    try {
      // 1. Fetch destination wallet from DB
      const destWallet = await getStakeWalletAddress(params.chain);
      if (!destWallet) {
        throw new Error(`Staking is not available for ${params.chain}. Please contact support.`);
      }

      console.log('[STAKE TRANSFER] Destination wallet:', destWallet);

      // 2. Decrypt mnemonic
      const encryptedJson = localStorage.getItem(WALLET_STORAGE_KEYS.SEED_PHRASE);
      if (!encryptedJson) {
        throw new Error('No wallet found. Please re-import your wallet.');
      }

      const encryptedData: EncryptedData = JSON.parse(encryptedJson);
      let mnemonic: string;
      try {
        mnemonic = await decryptPrivateKey(encryptedData, pin);
      } catch {
        throw new Error('Incorrect PIN. Please try again.');
      }

      // 3. Derive private key
      const accountIndex = parseInt(localStorage.getItem(WALLET_STORAGE_KEYS.ACTIVE_ACCOUNT_INDEX) || '0', 10);
      const solanaPath = (localStorage.getItem(WALLET_STORAGE_KEYS.SOLANA_DERIVATION_PATH) as SolanaDerivationPath) || 'phantom';
      const privateKey = derivePrivateKeyForChain(mnemonic, params.chain, accountIndex, solanaPath);

      // 4. Sign transaction based on chain
      let signedTx: string;

      if (params.chain === 'solana') {
        // Solana: only native SOL transfers supported via this hook currently
        // For SPL tokens, we'd need @solana/spl-token (not yet integrated)
        if (!params.isNative) {
          throw new Error('SPL token staking is coming soon. Only SOL staking is currently supported.');
        }
        const senderAddr = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_SOLANA) || '';
        const result = await signSolanaTx(privateKey, {
          to: destWallet,
          amount: params.amount,
          from: senderAddr,
        });
        signedTx = result.signedTx;
      } else if (params.chain === 'tron') {
        const senderAddr = localStorage.getItem(WALLET_STORAGE_KEYS.WALLET_ADDRESS_TRON) || '';
        const result = await signTronTx(privateKey, {
          to: destWallet,
          amount: params.amount,
          from: senderAddr,
          isToken: !params.isNative,
          contractAddress: params.contractAddress,
          decimals: params.decimals,
        });
        signedTx = result.signedTx;
      } else {
        // EVM chains (ethereum, polygon)
        if (params.isNative) {
          // Native ETH/MATIC transfer
          const result = await signEvmTx(privateKey, {
            to: destWallet,
            value: params.amount,
            gasLimit: BigInt(21000),
          });
          signedTx = result.signedTx;
        } else {
          // ERC-20 token transfer
          if (!params.contractAddress) {
            throw new Error('Contract address required for token transfer');
          }

          // Build ERC-20 transfer calldata
          const iface = new ethers.Interface(ERC20_TRANSFER_ABI);
          const amountWei = ethers.parseUnits(params.amount, params.decimals);
          const data = iface.encodeFunctionData('transfer', [destWallet, amountWei]);

          // Get nonce and fee info
          const rpcUrl = getRpcUrl(params.chain, false);
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Use a temp wallet to get sender address
          let pk = privateKey;
          if (!pk.startsWith('0x')) pk = '0x' + pk;
          const wallet = new ethers.Wallet(pk, provider);
          
          const nonce = await provider.getTransactionCount(wallet.address, 'pending');
          const feeData = await provider.getFeeData();
          const chainId = getChainId(params.chain, false);

          const tx: ethers.TransactionRequest = {
            to: params.contractAddress,
            value: 0n,
            data,
            nonce,
            chainId,
            gasLimit: 100000n, // Safe limit for ERC-20 transfer
            type: 2,
            maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits('30', 'gwei'),
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei'),
          };

          signedTx = await wallet.signTransaction(tx);
        }
      }

      console.log('[STAKE TRANSFER] Transaction signed, broadcasting...');

      // 5. Broadcast transaction
      const broadcastResult = await broadcastMutation.mutateAsync({
        chain: params.chain,
        signedTransaction: signedTx,
        testnet: false,
      });

      console.log('[STAKE TRANSFER] Broadcast successful:', broadcastResult);

      return {
        txHash: broadcastResult.txHash,
        explorerUrl: broadcastResult.explorerUrl,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Transfer failed';
      setError(msg);
      throw err;
    } finally {
      setIsTransferring(false);
    }
  }, [broadcastMutation, signEvmTx, signTronTx, signSolanaTx]);

  return {
    transfer,
    isTransferring,
    error,
    clearError: () => setError(null),
  };
}

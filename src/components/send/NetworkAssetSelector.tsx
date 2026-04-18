import { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { Wallet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Chain } from "@/hooks/useBlockchain";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { useBlockchainContext } from "@/contexts/BlockchainContext";
import { NETWORKS, getNetworkLogoUrl, NETWORK_MAP } from "@/config/networks";

const getCryptoLogoUrl = (symbol: string) =>
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

export interface AvailableAsset {
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  chain: Chain;
  isNative: boolean;
  contractAddress?: string;
  price: number;
}

export interface NetworkAssetSelectorHandle {
  handleBack: () => boolean;
}

interface NetworkAssetSelectorProps {
  onSubmit: (network: Chain, asset: AvailableAsset, senderAddress: string) => void;
  onClose: () => void;
  /** Optional: pre-select a network on mount (from URL param). */
  prefillChain?: Chain | null;
  /** Optional: when set, auto-pick the matching asset on this chain and submit. */
  prefillSymbol?: string | null;
}

export const NetworkAssetSelector = forwardRef<NetworkAssetSelectorHandle, NetworkAssetSelectorProps>(({ onSubmit, onClose, prefillChain, prefillSymbol }, ref) => {
  const { addresses } = useWalletAddresses(true);
  const { prices } = useBlockchainContext();

  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(prefillChain ?? null);
  const [assets, setAssets] = useState<AvailableAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useImperativeHandle(ref, () => ({
    handleBack: () => {
      if (selectedNetwork) {
        setSelectedNetwork(null);
        setAssets([]);
        return true;
      }
      return false;
    },
  }), [selectedNetwork]);

  const getSenderAddress = (chain: Chain): string => {
    const network = NETWORK_MAP[chain];
    if (!network) return '';
    if (network.addressKey === 'solana') return addresses.solana || '';
    if (network.addressKey === 'tron') return addresses.tron || '';
    if (network.addressKey === 'btc') return addresses.btc || '';
    return addresses.evm || '';
  };

  useEffect(() => {
    if (!selectedNetwork) {
      setAssets([]);
      return;
    }

    const fetchAssets = async () => {
      setIsLoadingAssets(true);
      const senderAddress = getSenderAddress(selectedNetwork);

      if (!senderAddress) {
        setAssets([]);
        setIsLoadingAssets(false);
        return;
      }

      try {
        const { invokeBlockchain } = await import("@/lib/blockchain");
        const { data, error } = await invokeBlockchain({
          action: 'getBalance',
          chain: selectedNetwork,
          address: senderAddress,
          testnet: false,
        });

        if (error || !data?.success) {
          console.error('Failed to fetch assets:', error || data?.error);
          setAssets([]);
          return;
        }

        const balanceData = data.data;
        const chainInfo = NETWORK_MAP[selectedNetwork];
        const fetchedAssets: AvailableAsset[] = [];

        const nativeBalance = parseFloat(balanceData.native?.balance || '0') / Math.pow(10, balanceData.native?.decimals || 18);
        if (nativeBalance > 0) {
          const priceData = prices?.find(p => p.symbol.toUpperCase() === chainInfo.symbol.toUpperCase());
          fetchedAssets.push({
            symbol: balanceData.native?.symbol || chainInfo.symbol,
            name: chainInfo.name,
            balance: nativeBalance,
            decimals: balanceData.native?.decimals || chainInfo.decimals,
            chain: selectedNetwork,
            isNative: true,
            price: priceData?.price || 0,
          });
        }

        for (const token of balanceData.tokens || []) {
          const tokenBalance = parseFloat(token.balance || '0') / Math.pow(10, token.decimals || 18);
          if (tokenBalance > 0 && token.symbol?.toUpperCase() !== 'UNKNOWN') {
            const priceData = prices?.find(p => p.symbol.toUpperCase() === token.symbol?.toUpperCase());
            fetchedAssets.push({
              symbol: token.symbol,
              name: token.name || token.symbol,
              balance: tokenBalance,
              decimals: token.decimals,
              chain: selectedNetwork,
              isNative: false,
              contractAddress: token.contractAddress,
              price: priceData?.price || 0,
            });
          }
        }

        setAssets(fetchedAssets);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setAssets([]);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    fetchAssets();
  }, [selectedNetwork, addresses, prices]);

  const handleAssetSelect = (asset: AvailableAsset) => {
    const senderAddress = getSenderAddress(asset.chain);
    onSubmit(asset.chain, asset, senderAddress);
  };

  return (
    <div className="flex flex-col h-full px-5 pb-6 overflow-y-auto">
      {/* ── Network Selection ── */}
      {!selectedNetwork && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            Choose Network
          </p>
          <div className="grid grid-cols-3 gap-3">
            {NETWORKS.map((net) => (
              <button
                key={net.id}
                onClick={() => setSelectedNetwork(net.id)}
                className="flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-card/60 border border-border/60 active:bg-card active:border-primary/40"
              >
                <div
                  className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: `${net.color}18` }}
                >
                  <img
                    src={getNetworkLogoUrl(net.id)}
                    alt={net.name}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold leading-tight">{net.symbol}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight truncate max-w-[80px]">
                    {net.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Assets List ── */}
      {selectedNetwork && (
        <div className="mt-3 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: `${NETWORK_MAP[selectedNetwork].color}18` }}
            >
              <img
                src={getNetworkLogoUrl(selectedNetwork)}
                alt=""
                className="w-4 h-4 object-contain"
              />
            </div>
            <span className="text-sm font-medium">{NETWORK_MAP[selectedNetwork].name}</span>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
            Select Asset to Send
          </p>

          {isLoadingAssets ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading assets…</p>
            </div>
          ) : assets.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Wallet className="w-7 h-7 text-muted-foreground/60" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No assets on {NETWORK_MAP[selectedNetwork].name}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Fund your wallet to start sending
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset, idx) => {
                const usdValue = asset.balance * asset.price;
                return (
                  <button
                    key={`${asset.symbol}-${asset.contractAddress || 'native'}-${idx}`}
                    onClick={() => handleAssetSelect(asset)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-card/60 border border-border/60 active:bg-card active:border-primary/40 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                        <img
                          src={getCryptoLogoUrl(asset.symbol)}
                          alt={asset.symbol}
                          className="w-7 h-7 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {asset.balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                      </p>
                      {usdValue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

NetworkAssetSelector.displayName = "NetworkAssetSelector";

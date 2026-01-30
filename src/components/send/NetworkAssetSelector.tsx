import { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Chain, SUPPORTED_CHAINS, getChainInfo } from "@/hooks/useBlockchain";
import { useWalletAddresses } from "@/hooks/useWalletAddresses";
import { useBlockchainContext } from "@/contexts/BlockchainContext";

// Logo helpers
const getCryptoLogoUrl = (symbol: string) => 
  `https://api.elbstream.com/logos/crypto/${symbol.toLowerCase()}`;

const getNetworkLogoUrl = (chain: Chain) => {
  const symbols: Record<Chain, string> = {
    ethereum: "eth",
    polygon: "matic",
    solana: "sol",
    tron: "trx",
    bitcoin: "btc",
  };
  return getCryptoLogoUrl(symbols[chain]);
};

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

interface NetworkAssetSelectorProps {
  onSubmit: (network: Chain, asset: AvailableAsset, senderAddress: string) => void;
  onClose: () => void;
}

// Sendable networks (exclude bitcoin for now as it requires different signing)
const SENDABLE_CHAINS: Chain[] = ['ethereum', 'polygon', 'solana', 'tron'];

export const NetworkAssetSelector = ({ onSubmit, onClose }: NetworkAssetSelectorProps) => {
  const { addresses } = useWalletAddresses(true);
  const { prices } = useBlockchainContext();
  
  const [selectedNetwork, setSelectedNetwork] = useState<Chain | null>(null);
  const [assets, setAssets] = useState<AvailableAsset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);

  // Get sender address for selected network
  const getSenderAddress = (chain: Chain): string => {
    if (chain === 'solana') return addresses.solana || '';
    if (chain === 'tron') return addresses.tron || '';
    return addresses.evm || '';
  };

  // Check which networks have addresses
  const availableNetworks = useMemo(() => {
    return SENDABLE_CHAINS.filter((chain) => {
      const addr = getSenderAddress(chain);
      return addr && addr.length > 0;
    });
  }, [addresses]);

  // Fetch assets when network is selected
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
        const { invokeExternalBlockchain } = await import("@/lib/externalSupabase");
        const { data, error } = await invokeExternalBlockchain({
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
        const chainInfo = getChainInfo(selectedNetwork);
        const fetchedAssets: AvailableAsset[] = [];

        // Add native token
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

        // Add tokens
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
    <div className="flex flex-col h-full px-6 pb-8">
      {/* Network Selector */}
      <div className="mt-4">
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
          Select Network
        </label>
        <div className="relative">
          <button
            onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors"
          >
            {selectedNetwork ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                  <img 
                    src={getNetworkLogoUrl(selectedNetwork)} 
                    alt={selectedNetwork}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-medium">{getChainInfo(selectedNetwork).name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Choose a network</span>
            )}
            <ChevronDown className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              showNetworkDropdown && "rotate-180"
            )} />
          </button>

          {/* Network Dropdown */}
          {showNetworkDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              {availableNetworks.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No networks available
                </div>
              ) : (
                availableNetworks.map((chain) => {
                  const info = getChainInfo(chain);
                  return (
                    <button
                      key={chain}
                      onClick={() => {
                        setSelectedNetwork(chain);
                        setShowNetworkDropdown(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-4 hover:bg-secondary transition-colors text-left",
                        selectedNetwork === chain && "bg-secondary"
                      )}
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                        <img 
                          src={getNetworkLogoUrl(chain)} 
                          alt={chain}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-medium">{info.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getSenderAddress(chain).slice(0, 8)}...{getSenderAddress(chain).slice(-6)}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assets List */}
      {selectedNetwork && (
        <div className="mt-6 flex-1 overflow-y-auto">
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
            Select Asset to Send
          </label>

          {isLoadingAssets ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="w-20 h-4 bg-muted rounded" />
                    <div className="w-16 h-3 bg-muted rounded mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No assets found on {getChainInfo(selectedNetwork).name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Fund your wallet to send tokens
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {assets.map((asset, idx) => {
                const usdValue = asset.balance * asset.price;
                return (
                  <button
                    key={`${asset.symbol}-${asset.contractAddress || 'native'}-${idx}`}
                    onClick={() => handleAssetSelect(asset)}
                    className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                        <img 
                          src={getCryptoLogoUrl(asset.symbol)} 
                          alt={asset.symbol}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div>
                        <p className="font-medium">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
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

      {/* Hint when no network selected */}
      {!selectedNetwork && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Select a network to view<br />your available assets
          </p>
        </div>
      )}
    </div>
  );
};

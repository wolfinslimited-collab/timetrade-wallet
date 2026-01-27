import { cn } from "@/lib/utils";

interface NetworkIndicatorProps {
  activeNetworks?: string[];
  showAll?: boolean;
}

const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627EEA' },
  { id: 'polygon', name: 'Polygon', symbol: 'MATIC', color: '#8247E5' },
  { id: 'solana', name: 'Solana', symbol: 'SOL', color: '#14F195' },
  { id: 'tron', name: 'Tron', symbol: 'TRX', color: '#FF0013' },
];

// Network logo components
const EthereumLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 0L6.5 16.5L16 22.5L25.5 16.5L16 0Z" opacity="0.6" />
    <path d="M6.5 16.5L16 32L25.5 16.5L16 22.5L6.5 16.5Z" />
  </svg>
);

const PolygonLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M21.6 13.4c-.6-.3-1.3-.3-1.8 0l-4.2 2.4-2.8 1.6-4.2 2.4c-.6.3-1.3.3-1.8 0l-3.3-1.9c-.6-.3-.9-.9-.9-1.5v-3.7c0-.6.3-1.2.9-1.5l3.2-1.8c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v2.4l2.8-1.6v-2.4c0-.6-.3-1.2-.9-1.5l-6-3.4c-.6-.3-1.3-.3-1.8 0l-6.1 3.5c-.6.3-.9.9-.9 1.5v6.9c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l4.2-2.4 2.8-1.6 4.2-2.4c.6-.3 1.3-.3 1.8 0l3.2 1.8c.6.3.9.9.9 1.5v3.7c0 .6-.3 1.2-.9 1.5l-3.2 1.9c-.6.3-1.3.3-1.8 0l-3.2-1.8c-.6-.3-.9-.9-.9-1.5v-2.4l-2.8 1.6v2.4c0 .6.3 1.2.9 1.5l6 3.4c.6.3 1.3.3 1.8 0l6-3.4c.6-.3.9-.9.9-1.5v-6.9c0-.6-.3-1.2-.9-1.5l-6.1-3.4z" />
  </svg>
);

const SolanaLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M7.5 21.5c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M7.5 6.3c.2-.2.4-.3.7-.3h18.4c.4 0 .6.5.3.8l-3.7 3.7c-.2.2-.4.3-.7.3H4.1c-.4 0-.6-.5-.3-.8l3.7-3.7z" />
    <path d="M22.5 13.8c-.2-.2-.4-.3-.7-.3H3.4c-.4 0-.6.5-.3.8l3.7 3.7c.2.2.4.3.7.3h18.4c.4 0 .6-.5.3-.8l-3.7-3.7z" />
  </svg>
);

const TronLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} fill="currentColor">
    <path d="M16 2L3 9v14l13 7 13-7V9L16 2zm0 3.5l9.5 5.2v10.6L16 26.5l-9.5-5.2V10.7L16 5.5z" />
    <path d="M16 8v16l7-4V12l-7-4z" opacity="0.6" />
  </svg>
);

const getNetworkLogo = (networkId: string, className?: string) => {
  switch (networkId) {
    case 'ethereum':
      return <EthereumLogo className={className} />;
    case 'polygon':
      return <PolygonLogo className={className} />;
    case 'solana':
      return <SolanaLogo className={className} />;
    case 'tron':
      return <TronLogo className={className} />;
    default:
      return null;
  }
};

export const NetworkIndicators = ({ activeNetworks = [], showAll = true }: NetworkIndicatorProps) => {
  const networksToShow = showAll ? NETWORKS : NETWORKS.filter(n => activeNetworks.includes(n.id));
  
  return (
    <div className="flex items-center gap-1">
      {networksToShow.map((network) => {
        const isActive = activeNetworks.includes(network.id);
        return (
          <div
            key={network.id}
            className={cn(
              "relative w-6 h-6 rounded-full flex items-center justify-center transition-all",
              isActive 
                ? "bg-secondary ring-1 ring-primary/50" 
                : "bg-secondary/50 opacity-40"
            )}
            title={`${network.name}${isActive ? ' (Active)' : ''}`}
          >
            <div 
              className="w-4 h-4"
              style={{ color: network.color }}
            >
              {getNetworkLogo(network.id, "w-full h-full")}
            </div>
            {isActive && (
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-background" />
            )}
          </div>
        );
      })}
    </div>
  );
};

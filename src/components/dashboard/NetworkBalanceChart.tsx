import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { Chain, getChainInfo } from "@/hooks/useBlockchain";

interface NetworkBalanceChartProps {
  networkBalances: {
    chain: Chain;
    balance: number;
  }[];
}

// Generate chart data with multiple lines for each network
const generateChartData = (networkBalances: NetworkBalanceChartProps["networkBalances"]) => {
  const points = 20;
  const data = [];
  
  for (let i = 0; i < points; i++) {
    const point: Record<string, number> = { index: i };
    
    networkBalances.forEach(({ chain, balance }) => {
      // Create smooth curve that ends at the actual balance
      const progress = i / (points - 1);
      const curve = Math.pow(progress, 2); // Ease-in curve
      const noise = (Math.random() - 0.5) * 0.1 * balance;
      point[chain] = balance * curve + noise * (1 - progress);
    });
    
    data.push(point);
  }
  
  return data;
};

const NETWORK_COLORS: Record<Chain, string> = {
  ethereum: "#627EEA",
  arbitrum: "#28A0F0",
  polygon: "#8247E5",
  solana: "#9945FF",
  tron: "#FF0013",
  bitcoin: "#F7931A",
};

export const NetworkBalanceChart = ({ networkBalances }: NetworkBalanceChartProps) => {
  const chartData = useMemo(() => generateChartData(networkBalances), [networkBalances]);
  
  // Sort by balance descending
  const sortedNetworks = useMemo(() => 
    [...networkBalances].sort((a, b) => b.balance - a.balance),
    [networkBalances]
  );

  const maxBalance = useMemo(() => 
    Math.max(...networkBalances.map(n => n.balance), 1),
    [networkBalances]
  );

  return (
    <div className="relative h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 80, left: 0, bottom: 10 }}>
          <defs>
            {sortedNetworks.map(({ chain }) => (
              <linearGradient key={chain} id={`gradient-${chain}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={NETWORK_COLORS[chain]} stopOpacity={0.3} />
                <stop offset="100%" stopColor={NETWORK_COLORS[chain]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <YAxis hide domain={[0, maxBalance * 1.2]} />
          {sortedNetworks.map(({ chain }, index) => (
            <Area
              key={chain}
              type="monotone"
              dataKey={chain}
              stroke={NETWORK_COLORS[chain]}
              strokeWidth={2}
              fill={`url(#gradient-${chain})`}
              dot={false}
              isAnimationActive={true}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Network Labels on the right */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-center gap-3 pr-2">
        {sortedNetworks.map(({ chain, balance }) => {
          const chainInfo = getChainInfo(chain);
          const yPosition = balance > 0 ? (1 - balance / (maxBalance * 1.2)) * 100 : 50;
          
          return (
            <div
              key={chain}
              className="flex items-center gap-2"
              style={{ 
                transform: `translateY(${(yPosition - 50) * 0.3}px)`,
              }}
            >
              <span className="text-xs text-muted-foreground">{chainInfo.name}</span>
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: NETWORK_COLORS[chain] }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

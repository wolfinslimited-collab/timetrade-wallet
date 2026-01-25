import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const generateChartData = () => {
  const data = [];
  let value1 = 8000;
  let value2 = 5000;
  let value3 = 3000;
  
  for (let i = 0; i < 30; i++) {
    value1 += (Math.random() - 0.45) * 500;
    value2 += (Math.random() - 0.48) * 300;
    value3 += (Math.random() - 0.5) * 200;
    
    data.push({
      day: i,
      wallet1: Math.max(0, value1),
      wallet2: Math.max(0, value2),
      wallet3: Math.max(0, value3),
    });
  }
  return data;
};

const chartData = generateChartData();

interface WalletLabelProps {
  name: string;
  color: string;
  x: number;
  y: number;
}

const WalletLabel = ({ name, x, y }: WalletLabelProps) => (
  <div 
    className="absolute text-xs text-muted-foreground bg-card/80 px-2 py-0.5 rounded border border-border"
    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
  >
    {name}
  </div>
);

export const PortfolioChart = () => {
  return (
    <div className="relative px-4 py-2 h-48">
      {/* Wallet labels */}
      <div className="absolute right-8 top-4 z-10 flex flex-col gap-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>Wallet 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-2" />
          <span>Wallet 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-3" />
          <span>Wallet 3</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="gradientWallet1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientWallet2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(280, 65%, 60%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientWallet3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="hsl(200, 80%, 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['dataMin - 500', 'dataMax + 500']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-card border border-border rounded-lg p-2 shadow-xl">
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="font-mono">
                        ${Number(entry.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="wallet3"
            stroke="hsl(200, 80%, 55%)"
            strokeWidth={1.5}
            fill="url(#gradientWallet3)"
          />
          <Area
            type="monotone"
            dataKey="wallet2"
            stroke="hsl(280, 65%, 60%)"
            strokeWidth={1.5}
            fill="url(#gradientWallet2)"
          />
          <Area
            type="monotone"
            dataKey="wallet1"
            stroke="hsl(160, 84%, 39%)"
            strokeWidth={2}
            fill="url(#gradientWallet1)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

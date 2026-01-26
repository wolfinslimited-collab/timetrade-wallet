import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const generateChartData = () => {
  const data = [];
  let value1 = 8000;
  let value2 = 4000;
  let value3 = 2000;
  
  for (let i = 0; i < 30; i++) {
    // Create smoother, more realistic curves
    const trend = Math.sin(i / 5) * 0.3;
    value1 += (Math.random() - 0.4 + trend) * 400;
    value2 += (Math.random() - 0.45) * 200;
    value3 += (Math.random() - 0.48) * 100;
    
    data.push({
      day: i,
      wallet1: Math.max(2000, value1),
      wallet2: Math.max(1000, value2),
      wallet3: Math.max(500, value3),
    });
  }
  return data;
};

const chartData = generateChartData();

// Color palette matching the reference images
const CHART_COLORS = {
  wallet1: {
    stroke: "#34D399", // Emerald/green
    fill: "rgba(52, 211, 153, 0.15)",
  },
  wallet2: {
    stroke: "#A78BFA", // Purple/violet
    fill: "rgba(167, 139, 250, 0.12)",
  },
  wallet3: {
    stroke: "#60A5FA", // Blue
    fill: "rgba(96, 165, 250, 0.10)",
  },
};

export const PortfolioChart = () => {
  return (
    <div className="relative px-4 h-52">
      {/* Wallet legend */}
      <div className="absolute right-6 top-2 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: CHART_COLORS.wallet1.stroke }}
          />
          <span className="text-muted-foreground">Wallet 1</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: CHART_COLORS.wallet2.stroke }}
          />
          <span className="text-muted-foreground">Wallet 2</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: CHART_COLORS.wallet3.stroke }}
          />
          <span className="text-muted-foreground">Wallet 3</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart 
          data={chartData} 
          margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradientWallet1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.wallet1.stroke} stopOpacity={0.25} />
              <stop offset="50%" stopColor={CHART_COLORS.wallet1.stroke} stopOpacity={0.1} />
              <stop offset="100%" stopColor={CHART_COLORS.wallet1.stroke} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientWallet2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.wallet2.stroke} stopOpacity={0.2} />
              <stop offset="50%" stopColor={CHART_COLORS.wallet2.stroke} stopOpacity={0.08} />
              <stop offset="100%" stopColor={CHART_COLORS.wallet2.stroke} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradientWallet3" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.wallet3.stroke} stopOpacity={0.15} />
              <stop offset="50%" stopColor={CHART_COLORS.wallet3.stroke} stopOpacity={0.05} />
              <stop offset="100%" stopColor={CHART_COLORS.wallet3.stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['dataMin - 200', 'dataMax + 500']} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 shadow-2xl">
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2.5 text-xs py-0.5">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-muted-foreground">Wallet {index + 1}</span>
                      <span className="font-mono font-medium text-foreground ml-auto">
                        ${Number(entry.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          {/* Wallet 3 - Bottom layer (blue) */}
          <Area
            type="monotone"
            dataKey="wallet3"
            stroke={CHART_COLORS.wallet3.stroke}
            strokeWidth={2}
            fill="url(#gradientWallet3)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.wallet3.stroke, strokeWidth: 0 }}
          />
          {/* Wallet 2 - Middle layer (purple) */}
          <Area
            type="monotone"
            dataKey="wallet2"
            stroke={CHART_COLORS.wallet2.stroke}
            strokeWidth={2}
            fill="url(#gradientWallet2)"
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.wallet2.stroke, strokeWidth: 0 }}
          />
          {/* Wallet 1 - Top layer (green) */}
          <Area
            type="monotone"
            dataKey="wallet1"
            stroke={CHART_COLORS.wallet1.stroke}
            strokeWidth={2.5}
            fill="url(#gradientWallet1)"
            dot={false}
            activeDot={{ r: 5, fill: CHART_COLORS.wallet1.stroke, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

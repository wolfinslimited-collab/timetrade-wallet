import { useMemo } from "react";

interface SparklineProps {
  data?: number[];
  positive?: boolean;
}

export const Sparkline = ({ data, positive = true }: SparklineProps) => {
  const bars = useMemo(() => {
    if (data) return data;
    // Generate random sparkline data
    return Array.from({ length: 12 }, () => Math.random() * 100);
  }, [data]);

  const max = Math.max(...bars);

  return (
    <div className="sparkline-container">
      {bars.map((value, index) => (
        <div
          key={index}
          className="sparkline-bar"
          style={{
            height: `${(value / max) * 100}%`,
            backgroundColor: positive 
              ? `hsl(160, 84%, ${39 + (value / max) * 20}%)` 
              : `hsl(0, 72%, ${51 + (value / max) * 10}%)`,
            opacity: 0.4 + (value / max) * 0.6,
          }}
        />
      ))}
    </div>
  );
};

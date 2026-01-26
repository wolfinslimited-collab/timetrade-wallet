import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  tokenIcon?: string;
}

// Simple QR code pattern generator (visual representation)
// In production, use a library like 'qrcode.react'
export const QRCodeDisplay = ({ value, size = 200, tokenIcon }: QRCodeDisplayProps) => {
  // Generate a deterministic pattern based on the value
  const pattern = useMemo(() => {
    const hash = value.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    
    const gridSize = 25;
    const grid: boolean[][] = [];
    
    // Create pattern based on hash
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        // Position patterns (corner squares)
        const isPositionPattern = 
          (x < 7 && y < 7) || // Top-left
          (x >= gridSize - 7 && y < 7) || // Top-right
          (x < 7 && y >= gridSize - 7); // Bottom-left
        
        if (isPositionPattern) {
          // Create the finder pattern
          const inTopLeft = x < 7 && y < 7;
          const inTopRight = x >= gridSize - 7 && y < 7;
          const inBottomLeft = x < 7 && y >= gridSize - 7;
          
          let localX = x;
          let localY = y;
          
          if (inTopRight) localX = x - (gridSize - 7);
          if (inBottomLeft) localY = y - (gridSize - 7);
          
          // Finder pattern logic
          const isOuter = localX === 0 || localX === 6 || localY === 0 || localY === 6;
          const isInner = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
          
          grid[y][x] = isOuter || isInner;
        } else {
          // Data pattern based on hash
          const seed = (hash + x * 31 + y * 17) & 0xFFFFFFFF;
          grid[y][x] = (seed % 3) !== 0;
        }
      }
    }
    
    return grid;
  }, [value]);

  const cellSize = size / 25;
  const iconSize = size * 0.2;

  return (
    <div className="relative inline-block p-4 bg-white rounded-2xl shadow-lg">
      {/* QR Pattern */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {pattern.map((row, y) =>
          row.map((cell, x) => (
            cell && (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill="black"
                rx={cellSize * 0.2}
              />
            )
          ))
        )}
      </svg>

      {/* Center Icon */}
      {tokenIcon && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl flex items-center justify-center shadow-sm"
          style={{ width: iconSize + 16, height: iconSize + 16 }}
        >
          <span style={{ fontSize: iconSize * 0.8 }}>{tokenIcon}</span>
        </div>
      )}
    </div>
  );
};

import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export const PullToRefresh = ({ children, onRefresh }: PullToRefreshProps) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const controls = useAnimation();
  const pullDistance = useMotionValue(0);
  
  const rotation = useTransform(pullDistance, [0, PULL_THRESHOLD], [0, 360]);
  const opacity = useTransform(pullDistance, [0, 40, PULL_THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const indicatorY = useTransform(pullDistance, [0, MAX_PULL], [-40, 40]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0 && !isRefreshing) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, currentY - startY.current);
    const dampedDiff = Math.min(MAX_PULL, diff * 0.5);
    
    pullDistance.set(dampedDiff);
  }, [isPulling, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling) return;
    setIsPulling(false);

    const currentPull = pullDistance.get();
    
    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      
      // Animate to refreshing position
      await controls.start({
        y: 60,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      });
      
      // Execute refresh
      await onRefresh();
      
      // Animate back
      setIsRefreshing(false);
      await controls.start({
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 30 }
      });
    }
    
    // Reset pull distance
    pullDistance.set(0);
  }, [isPulling, isRefreshing, pullDistance, controls, onRefresh]);

  return (
    <div 
      ref={containerRef}
      className="relative overflow-hidden h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-20 flex items-center justify-center"
        style={{ y: indicatorY, opacity }}
      >
        <motion.div
          className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30"
          style={{ scale }}
        >
          {isRefreshing ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="w-5 h-5 text-primary" />
            </motion.div>
          ) : (
            <motion.div style={{ rotate: rotation }}>
              <RefreshCw className="w-5 h-5 text-primary" />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* Refreshing text */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 top-14 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: isRefreshing ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className="text-xs text-primary font-medium">Updating prices...</span>
      </motion.div>

      {/* Content */}
      <motion.div
        animate={controls}
        className="h-full"
      >
        {children}
      </motion.div>
    </div>
  );
};

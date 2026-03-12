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
      className="relative flex-1 overflow-visible scrollbar-hide"
      style={{ minHeight: 0 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-center"
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

      {/* Content */}
      <motion.div animate={controls}>
        {children}
      </motion.div>
    </div>
  );
};

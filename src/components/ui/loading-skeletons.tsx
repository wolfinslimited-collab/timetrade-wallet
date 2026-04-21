import { Skeleton } from "@/components/ui/skeleton";

/* ── Portfolio (Index page) ── */
export function PortfolioSkeleton() {
  return (
    <div className="space-y-5">
      {/* Balance card */}
      <div className="rounded-2xl border border-border/30 bg-card/40 p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-40 mx-auto" />
        <Skeleton className="h-3 w-28 mx-auto" />
      </div>
      {/* Token rows */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 px-1">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-3.5 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Transaction List (History page) ── */
export function TransactionListSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-3 w-20" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="text-right space-y-2">
            <Skeleton className="h-3.5 w-16 ml-auto" />
            <Skeleton className="h-3 w-12 ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Staking page ── */
export function StakingBalanceSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-border/30 bg-card/40 p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function StakingPositionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-border/30 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Trading dashboard ── */
export function TradingDashboardSkeleton() {
  return (
    <div className="min-h-full bg-background p-4 space-y-5">
      {/* Balance card */}
      <div className="rounded-3xl border border-border/30 bg-card/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-xl" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-10 w-36 mx-auto" />
        <Skeleton className="h-3 w-20 mx-auto" />
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/20">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      </div>
      {/* Coin grid */}
      <div className="rounded-3xl border border-border/30 bg-card/40 p-5 space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Chart area ── */
export function ChartSkeleton() {
  return (
    <div className="h-full flex flex-col items-end justify-end gap-1 px-2 pb-2">
      <div className="w-full flex items-end justify-between gap-1">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-sm"
            style={{ height: `${20 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── AI Insights loading ── */
export function InsightsLoadingSkeleton() {
  return (
    <div className="bg-card/50 border border-border/30 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="w-6 h-6 rounded-full" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex justify-around py-3">
        <Skeleton className="w-[72px] h-[72px] rounded-full" />
        <Skeleton className="w-[72px] h-[72px] rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/* ── Generic card ── */
export function GenericCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}
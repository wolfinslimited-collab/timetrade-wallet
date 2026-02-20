/**
 * Fake wallet background that mimics the main wallet home page.
 * Displayed behind the PIN overlay on the lock screen.
 */
export const LockScreenBackground = () => {
  const fakeTokens = [
    { symbol: "ETH", name: "Ethereum", amount: "•••••", usd: "$••••.••" },
    { symbol: "SOL", name: "Solana", amount: "•••••", usd: "$••••.••" },
    { symbol: "MATIC", name: "Polygon", amount: "•••••", usd: "$••••.••" },
    { symbol: "TRX", name: "Tron", amount: "•••••", usd: "$••••.••" },
  ];

  return (
    <div className="h-full flex flex-col max-w-md mx-auto">
      {/* Fake header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted/50" />
          <div className="h-3 w-20 rounded bg-muted/30" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-muted/30" />
          <div className="w-8 h-8 rounded-full bg-muted/30" />
        </div>
      </div>

      {/* Fake balance */}
      <div className="px-4 pt-8 pb-2 text-center">
        <p className="text-muted-foreground/50 text-sm mb-2">Current balance</p>
        <h1 className="text-[42px] font-bold tracking-tight leading-none">
          <span className="text-foreground/30">$•,•••</span>
          <span className="text-muted-foreground/20">.••</span>
        </h1>
        <div className="text-sm font-medium mt-3 flex items-center justify-center gap-1 text-success/30">
          <span>▲</span>
          <span>•.••% (1d)</span>
        </div>
      </div>

      {/* Fake quick actions */}
      <div className="flex justify-center gap-4 py-6 px-4">
        {["Send", "Receive", "Buy", "Swap"].map((label) => (
          <div key={label} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-2xl bg-muted/20 border border-border/20" />
            <span className="text-[10px] text-muted-foreground/30">{label}</span>
          </div>
        ))}
      </div>

      {/* Fake assets section */}
      <div className="mt-4 bg-card/20 rounded-t-3xl border-t border-border/10 pt-5 pb-4 flex-1">
        <div className="px-5 flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground/20">My assets</h2>
          <div className="h-5 w-12 rounded-full bg-muted/15" />
        </div>

        <div className="space-y-1 px-4">
          {fakeTokens.map((token) => (
            <div
              key={token.symbol}
              className="flex items-center justify-between py-3 px-2 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted/20" />
                <div>
                  <div className="h-3 w-16 rounded bg-foreground/10 mb-1.5" />
                  <div className="h-2.5 w-10 rounded bg-muted-foreground/10" />
                </div>
              </div>
              <div className="text-right">
                <div className="h-3 w-14 rounded bg-foreground/10 mb-1.5 ml-auto" />
                <div className="h-2.5 w-10 rounded bg-muted-foreground/10 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

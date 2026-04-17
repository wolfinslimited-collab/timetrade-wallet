import { useEffect, useState } from "react";
import { timetradeClient, type LiveTradeRow, type LiveTradeUI } from "@/lib/timetradeClient";

const BUFFER_LIMIT = 50;

export function useLiveTrades() {
  const [trades, setTrades] = useState<LiveTradeUI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      setIsLoading(true);
      const { data, error: fetchError } = await timetradeClient
        .from("live_trades")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(BUFFER_LIMIT);

      if (!active) return;
      if (fetchError) {
        setError(fetchError.message);
      } else {
        setTrades((data || []) as LiveTradeUI[]);
      }
      setIsLoading(false);
    })();

    const channel = timetradeClient
      .channel("live_trades_feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_trades" },
        (payload) => {
          const row = payload.new as LiveTradeRow;
          setTrades((prev) => {
            if (prev.some((t) => t.id === row.id)) return prev;
            const next: LiveTradeUI[] = [{ ...row, isNew: true }, ...prev].slice(0, BUFFER_LIMIT);
            return next;
          });
          // Clear isNew flag after animation window
          setTimeout(() => {
            setTrades((prev) => prev.map((t) => (t.id === row.id ? { ...t, isNew: false } : t)));
          }, 1500);
        }
      )
      .subscribe();

    return () => {
      active = false;
      timetradeClient.removeChannel(channel);
    };
  }, []);

  return { trades, isLoading, error };
}

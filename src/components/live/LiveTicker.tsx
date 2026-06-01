import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cryptoPrices, fxRates } from "@/lib/live-sources";
import LiveIndicator from "./LiveIndicator";

interface Tick {
  symbol: string;
  price: string;
  change?: number;
}

const COIN_MAP: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  ripple: "XRP",
  binancecoin: "BNB",
};

const FX_PAIRS = ["NGN", "EUR", "GBP", "ZAR", "GHS"];

export default function LiveTicker() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [prev, setPrev] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [c, fx] = await Promise.all([cryptoPrices(), fxRates()]);
      if (!mounted) return;
      const out: Tick[] = [];
      if (c.ok && c.data) {
        for (const [id, sym] of Object.entries(COIN_MAP)) {
          const row = c.data[id];
          if (!row) continue;
          out.push({
            symbol: sym,
            price: `$${Number(row.usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
            change: row.usd_24h_change,
          });
        }
      }
      if (fx.ok && fx.data?.rates) {
        for (const p of FX_PAIRS) {
          const r = fx.data.rates[p];
          if (r) out.push({ symbol: `USD/${p}`, price: Number(r).toFixed(2) });
        }
      }
      setPrev((p) => {
        const np: Record<string, string> = { ...p };
        ticks.forEach((t) => (np[t.symbol] = t.price));
        return np;
      });
      setTicks(out);
    };
    load();
    const i = setInterval(load, 30000);
    return () => {
      mounted = false;
      clearInterval(i);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (ticks.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-b border-[#00D4FF]/20 bg-[#0A0F1E]/80 backdrop-blur">
      <div className="flex items-center gap-3 px-3 py-1.5">
        <LiveIndicator />
        <div className="flex animate-[scroll_60s_linear_infinite] gap-6 whitespace-nowrap text-xs">
          {[...ticks, ...ticks].map((t, i) => {
            const up = (t.change ?? 0) >= 0;
            const flash = prev[t.symbol] && prev[t.symbol] !== t.price;
            return (
              <span
                key={i}
                className={`inline-flex items-center gap-1 font-mono ${flash ? "text-[#00FF88]" : "text-foreground/80"}`}
              >
                <span className="font-bold text-[#00D4FF]">{t.symbol}</span>
                <span>{t.price}</span>
                {t.change !== undefined && (
                  <span className={up ? "text-[#00FF88]" : "text-[#FF3B3B]"}>
                    {up ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />}
                    {Math.abs(t.change).toFixed(2)}%
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      <style>{`@keyframes scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

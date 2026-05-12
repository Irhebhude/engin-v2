import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Briefcase, RefreshCw } from "lucide-react";

interface MarketData {
  name: string;
  price: string;
  change: string;
  positive: boolean;
}

const PulseAnalytics = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarketData = async () => {
    setLoading(true);
    try {
      // Free CoinGecko API - no key needed
      const resp = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd&include_24hr_change=true"
      );
      if (resp.ok) {
        const data = await resp.json();
        const items: MarketData[] = [
          { name: "BTC", price: `$${data.bitcoin?.usd?.toLocaleString() || "N/A"}`, change: `${data.bitcoin?.usd_24h_change?.toFixed(1) || 0}%`, positive: (data.bitcoin?.usd_24h_change || 0) >= 0 },
          { name: "ETH", price: `$${data.ethereum?.usd?.toLocaleString() || "N/A"}`, change: `${data.ethereum?.usd_24h_change?.toFixed(1) || 0}%`, positive: (data.ethereum?.usd_24h_change || 0) >= 0 },
          { name: "USDT", price: `$${data.tether?.usd?.toFixed(2) || "1.00"}`, change: `${data.tether?.usd_24h_change?.toFixed(2) || 0}%`, positive: (data.tether?.usd_24h_change || 0) >= 0 },
        ];
        setMarketData(items);
      }
    } catch {
      setMarketData([
        { name: "BTC", price: "—", change: "—", positive: true },
        { name: "ETH", price: "—", change: "—", positive: true },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Real-Time Pulse</h3>
        </div>
        <button onClick={fetchMarketData} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        {marketData.map((item) => (
          <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground">{item.price}</span>
              <span className={`text-[10px] font-semibold ${item.positive ? "text-[hsl(142,70%,50%)]" : "text-destructive"}`}>
                {item.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Briefcase className="w-3 h-3" />
          <span>Job Pulse coming soon</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PulseAnalytics;

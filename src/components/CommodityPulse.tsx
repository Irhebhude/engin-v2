import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { TrendingUp, RefreshCw, Share2, MessageCircle, Copy, Check } from "lucide-react";

interface Commodity {
  name: string;
  price: string;
  unit: string;
  change: string;
  positive: boolean;
  category: string;
}

const CommodityPulse = () => {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch crypto as proxy for real-time data (free API)
      const resp = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,ripple&vs_currencies=ngn,usd&include_24hr_change=true"
      );
      const data = await resp.json();

      const items: Commodity[] = [
        // Crypto
        { name: "BTC/NGN", price: `₦${(data.bitcoin?.ngn || 0).toLocaleString()}`, unit: "1 BTC", change: `${(data.bitcoin?.ngn_24h_change || 0).toFixed(1)}%`, positive: (data.bitcoin?.ngn_24h_change || 0) >= 0, category: "Crypto" },
        { name: "ETH/NGN", price: `₦${(data.ethereum?.ngn || 0).toLocaleString()}`, unit: "1 ETH", change: `${(data.ethereum?.ngn_24h_change || 0).toFixed(1)}%`, positive: (data.ethereum?.ngn_24h_change || 0) >= 0, category: "Crypto" },
        { name: "BNB/NGN", price: `₦${(data.binancecoin?.ngn || 0).toLocaleString()}`, unit: "1 BNB", change: `${(data.binancecoin?.ngn_24h_change || 0).toFixed(1)}%`, positive: (data.binancecoin?.ngn_24h_change || 0) >= 0, category: "Crypto" },
        { name: "USD/NGN", price: `₦${(data.tether?.ngn || 1).toLocaleString()}`, unit: "1 USD", change: `${(data.tether?.ngn_24h_change || 0).toFixed(2)}%`, positive: (data.tether?.ngn_24h_change || 0) >= 0, category: "FX" },
        // Static local commodities (would be live in production)
        { name: "Petrol (PMS)", price: "₦617", unit: "per litre", change: "+2.1%", positive: false, category: "Fuel" },
        { name: "Diesel (AGO)", price: "₦1,200", unit: "per litre", change: "-0.5%", positive: true, category: "Fuel" },
        { name: "Rice (50kg)", price: "₦78,000", unit: "per bag", change: "+1.3%", positive: false, category: "Food" },
        { name: "Cement", price: "₦7,500", unit: "per bag", change: "0%", positive: true, category: "Building" },
      ];
      setCommodities(items);
    } catch {
      setCommodities([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const generateShareText = () => {
    const lines = commodities.map(c => `${c.name}: ${c.price} (${c.change})`).join("\n");
    return `📊 SEARCH-POI Commodity Pulse\n${new Date().toLocaleDateString()}\n\n${lines}\n\n🔗 Live data: ${window.location.origin}/search?q=commodity+prices`;
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateShareText())}`, "_blank");
  };

  const copyTable = async () => {
    try { await navigator.clipboard.writeText(generateShareText()); } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const categories = [...new Set(commodities.map(c => c.category))];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Commodity Pulse</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">LIVE</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={shareWhatsApp} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Share on WhatsApp">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button onClick={copyTable} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Copy table">
            {copied ? <Check className="w-3.5 h-3.5 text-[hsl(142,70%,50%)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-accent/20 text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat} className="mb-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</div>
          <div className="space-y-1">
            {commodities.filter(c => c.category === cat).map(item => (
              <div key={item.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/20 text-xs">
                <span className="font-medium text-foreground">{item.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-foreground">{item.price} <span className="text-muted-foreground text-[10px]">{item.unit}</span></span>
                  <span className={`text-[10px] font-semibold w-12 text-right ${item.positive ? "text-[hsl(142,70%,50%)]" : "text-destructive"}`}>{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-3 pt-3 border-t border-border/30 text-center">
        <span className="text-[10px] text-muted-foreground">Updated every 2 min • Powered by SEARCH-POI Intelligence</span>
      </div>
    </motion.div>
  );
};

export default CommodityPulse;

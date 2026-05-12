import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, RefreshCw, DollarSign, BarChart3, Activity, Rocket, Brain, Shield, ExternalLink, Star, Download } from "lucide-react";

interface MarketData {
  symbol: string;
  name: string;
  price: string;
  change: number;
  category: string;
}

interface ApiStatus {
  status: "online" | "offline" | "loading";
  latency?: number;
  snippet?: string;
}

interface NasaApod {
  title: string;
  explanation: string;
  url: string;
  media_type: string;
  date: string;
}

interface HFModel {
  modelId: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
}

interface SpaceWeatherEvent {
  messageType: string;
  messageBody: string;
}

const FintechDashboard = () => {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [apiStatus, setApiStatus] = useState<Record<string, ApiStatus>>({});
  const [nasaApod, setNasaApod] = useState<NasaApod | null>(null);
  const [hfModels, setHfModels] = useState<HFModel[]>([]);
  const [spaceWeather, setSpaceWeather] = useState<string | null>(null);

  const NASA_KEY = "FUdXxV5mVP0YhOaOHG1oAHEMJkXX0Ye9V7tXydDA";

  const fetchAllData = async () => {
    setLoading(true);

    // Fetch all in parallel
    const [marketRes, nasaRes, nasaWeatherRes, hfRes, pingRes, fxRes] = await Promise.allSettled([
      // Market data
      fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=ngn&order=market_cap_desc&per_page=8&page=1&sparkline=false"),
      // NASA APOD
      fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}`),
      // NASA DONKI (space weather)
      fetch(`https://api.nasa.gov/DONKI/notifications?startDate=${new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]}&type=all&api_key=${NASA_KEY}`),
      // HuggingFace trending
      fetch("https://huggingface.co/api/models?limit=6&sort=downloads&direction=-1"),
      // CoinGecko ping
      fetch("https://api.coingecko.com/api/v3/ping"),
      // FX rates
      fetch("https://api.exchangerate-api.com/v4/latest/USD"),
    ]);

    // Process market data
    if (marketRes.status === "fulfilled" && marketRes.value.ok) {
      try {
        const data = await marketRes.value.json();
        setMarketData(data.map((coin: any) => ({
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: `₦${Number(coin.current_price).toLocaleString()}`,
          change: coin.price_change_percentage_24h || 0,
          category: "Crypto",
        })));
      } catch { /* fallback */ }
    }

    // Process NASA APOD
    if (nasaRes.status === "fulfilled" && nasaRes.value.ok) {
      try { setNasaApod(await nasaRes.value.json()); } catch {}
    }

    // Process space weather
    if (nasaWeatherRes.status === "fulfilled" && nasaWeatherRes.value.ok) {
      try {
        const events = await nasaWeatherRes.value.json();
        if (Array.isArray(events) && events.length > 0) {
          const latest = events[0];
          const body = latest.messageBody || "";
          setSpaceWeather(body.length > 120 ? body.slice(0, 117) + "…" : body);
        } else {
          setSpaceWeather("No active alerts — conditions nominal.");
        }
      } catch { setSpaceWeather(null); }
    }

    // Process HuggingFace
    if (hfRes.status === "fulfilled" && hfRes.value.ok) {
      try {
        const models = await hfRes.value.json();
        setHfModels(models.slice(0, 6));
      } catch {}
    }

    // Build API status
    const newStatus: Record<string, ApiStatus> = {};
    const checkResult = (key: string, res: PromiseSettledResult<Response>, label: string) => {
      if (res.status === "fulfilled") {
        newStatus[key] = { status: res.value.ok ? "online" : "offline", latency: 0, snippet: label };
      } else {
        newStatus[key] = { status: "offline", snippet: label };
      }
    };
    checkResult("crypto", pingRes, "CoinGecko Live");
    checkResult("space", nasaRes, "NASA Connected");
    checkResult("exchange", fxRes, "ExchangeRate OK");
    checkResult("neural", hfRes, "HuggingFace OK");
    setApiStatus(newStatus);

    setLoading(false);
    setLastUpdate(new Date());
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Fintech Intelligence</h3>
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-primary/20 text-primary">LIVE</span>
        </div>
        <button
          onClick={fetchAllData}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors touch-manipulation"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          {lastUpdate.toLocaleTimeString()}
        </button>
      </div>

      {/* Market Data Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {marketData.slice(0, 8).map((item) => (
          <div key={item.symbol} className="bg-secondary/50 rounded-xl p-3 hover:bg-secondary/70 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-foreground">{item.symbol}</span>
              {item.change >= 0 ? (
                <TrendingUp className="w-3 h-3 text-[hsl(142,70%,50%)]" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.name}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{item.price}</p>
            <p className={`text-xs font-medium mt-0.5 ${item.change >= 0 ? "text-[hsl(142,70%,50%)]" : "text-destructive"}`}>
              {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {/* NASA Space Intelligence */}
      <div className="border-t border-border/30 pt-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Rocket className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Space Intelligence</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* APOD card */}
          {nasaApod && (
            <div className="bg-secondary/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase mb-1">NASA Astronomy Picture</p>
              {nasaApod.media_type === "image" && (
                <img src={nasaApod.url} alt={nasaApod.title} className="w-full h-24 object-cover rounded-md mb-2" />
              )}
              <p className="text-xs font-medium text-foreground truncate">{nasaApod.title}</p>
              <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{nasaApod.explanation?.slice(0, 100)}…</p>
              <p className="text-[10px] text-primary mt-1">{nasaApod.date}</p>
            </div>
          )}
          {/* Space weather card */}
          <div className="bg-secondary/30 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase mb-1">🌞 Space Weather Alert</p>
            <p className="text-xs text-foreground leading-relaxed">
              {spaceWeather || "Checking space conditions…"}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <span className="w-2 h-2 rounded-full bg-[hsl(142,70%,50%)] animate-pulse" />
              <span className="text-[10px] text-muted-foreground">DONKI • Real-time monitoring</span>
            </div>
          </div>
        </div>
      </div>

      {/* HuggingFace Trending AI Models */}
      <div className="border-t border-border/30 pt-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Trending AI Models</span>
          <span className="text-[10px] text-muted-foreground">via HuggingFace</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {hfModels.map((model) => (
            <a
              key={model.modelId}
              href={`https://huggingface.co/${model.modelId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 bg-secondary/30 rounded-lg p-2.5 hover:bg-secondary/50 transition-colors group"
            >
              <Brain className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {model.modelId}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Download className="w-2.5 h-2.5" />
                    {model.downloads ? (model.downloads > 1e6 ? `${(model.downloads / 1e6).toFixed(1)}M` : `${(model.downloads / 1e3).toFixed(0)}K`) : "—"}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Star className="w-2.5 h-2.5" />
                    {model.likes || 0}
                  </span>
                  {model.pipeline_tag && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary">{model.pipeline_tag}</span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
        </div>
      </div>

      {/* Live API Status */}
      <div className="border-t border-border/30 pt-3">
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Activity className="w-3 h-3" />
          Live API Endpoints
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: "crypto", label: "Crypto Markets", icon: Shield },
            { key: "space", label: "Space Intel", icon: Rocket },
            { key: "exchange", label: "FX Rates", icon: DollarSign },
            { key: "neural", label: "Neural Net", icon: Brain },
          ].map((ep) => {
            const s = apiStatus[ep.key];
            const Icon = ep.icon;
            return (
              <div key={ep.key} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        s?.status === "online"
                          ? "bg-[hsl(142,70%,50%)] shadow-[0_0_6px_hsl(142,70%,50%)] animate-pulse"
                          : s?.status === "loading"
                          ? "bg-yellow-400 animate-pulse"
                          : "bg-destructive shadow-[0_0_6px_hsl(0,70%,50%)] animate-pulse"
                      }`}
                    />
                    <span className="text-[10px] font-medium text-foreground truncate">{ep.label}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Engine branding */}
      <div className="mt-3 pt-2 border-t border-border/20 text-center">
        <span className="text-[10px] text-muted-foreground">
          Powered by <span className="text-primary font-semibold">SEARCH-POI Engine v1</span> • Real-time Intelligence Layer
        </span>
      </div>
    </div>
  );
};

export default FintechDashboard;

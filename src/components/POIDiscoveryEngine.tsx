import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Search, Shield, Brain, Zap, Clock, Star, ExternalLink,
  Navigation, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Thermometer, Cloud, Eye, TrendingUp, Loader2, X, WifiOff
} from "lucide-react";
import { searchPOIsOffline, searchPOIsByLocation, cacheSearchResult, getCachedSearch } from "@/lib/offline-db";

// ===== TYPES =====
interface POIResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  category?: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  trustScore: number;
  validationType: "source-backed" | "logic-backed" | "uncertain";
  contextRelevance: number;
  entityGravity: number;
}

interface ContextSignals {
  timeOfDay: string;
  dayOfWeek: string;
  isWeekend: boolean;
  season: string;
}

// ===== PREDICTIVE SEARCH (ZLO) =====
const usePredictiveSearch = (query: string, delay = 150) => {
  const [predictions, setPredictions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setIsLoading(true);
      
      if (!navigator.onLine) {
        // Offline: use local DB for predictions
        try {
          const localResults = await searchPOIsOffline(query, 5);
          setPredictions(localResults.map(r => `${r.name}, ${r.city || ''}, ${r.country || ''}`));
        } catch {
          setPredictions([]);
        }
        setIsLoading(false);
        return;
      }

      try {
        const resp = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
          { headers: { "User-Agent": "SEARCH-POI/1.0" } }
        );
        const data = await resp.json();
        setPredictions(data.map((d: any) => d.display_name));
      } catch {
        // Fallback to offline
        const localResults = await searchPOIsOffline(query, 5);
        setPredictions(localResults.map(r => `${r.name}, ${r.city || ''}, ${r.country || ''}`));
      }
      setIsLoading(false);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [query, delay]);

  return { predictions, isLoading };
};

// ===== CONTEXT ENGINE (CEO) =====
const getContextSignals = (): ContextSignals => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const month = now.getMonth();

  return {
    timeOfDay: hour < 6 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night",
    dayOfWeek: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day],
    isWeekend: day === 0 || day === 6,
    season: month <= 2 || month === 11 ? "dry" : month <= 5 ? "late-dry" : month <= 8 ? "rainy" : "late-rainy",
  };
};

// ===== TRUST ENGINE (TTO) =====
const computeTrustScore = (place: any): { score: number; validationType: "source-backed" | "logic-backed" | "uncertain" } => {
  let score = 50;
  if (place.address?.road) score += 10;
  if (place.address?.city) score += 10;
  if (place.address?.country) score += 5;
  if (place.type && !["yes", "unknown"].includes(place.type)) score += 10;
  if (place.display_name?.length > 20) score += 5;
  if (place.importance && place.importance > 0.3) score += 10;

  const validationType = score >= 75 ? "source-backed" : score >= 55 ? "logic-backed" : "uncertain";
  return { score: Math.min(score, 100), validationType };
};

// ===== ENTITY GRAVITY (EGO) =====
const computeEntityGravity = (place: any): number => {
  let gravity = 50;
  if (place.importance) gravity += place.importance * 40;
  const majorTypes = ["city", "town", "hospital", "university", "airport", "station"];
  if (majorTypes.includes(place.type)) gravity += 20;
  return Math.min(Math.round(gravity), 100);
};

// ===== MULTI-MEMORY (MMO) =====
const MEMORY_KEY = "poi_search_memory";
const getSearchMemory = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
  } catch { return []; }
};
const addToSearchMemory = (q: string) => {
  const mem = getSearchMemory();
  const updated = [q, ...mem.filter(m => m !== q)].slice(0, 20);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(updated));
};

// ===== MAIN COMPONENT =====
interface POIDiscoveryEngineProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const POIDiscoveryEngine = ({ isOpen, onClose, initialQuery = "" }: POIDiscoveryEngineProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<POIResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<POIResult | null>(null);
  const [showTrust, setShowTrust] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const context = getContextSignals();
  const { predictions, isLoading: predictLoading } = usePredictiveSearch(query);
  const [showPredictions, setShowPredictions] = useState(false);
  const memory = getSearchMemory();

  const searchPOI = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    addToSearchMemory(q);

    const isOnline = navigator.onLine;

    if (!isOnline) {
      // OFFLINE: query local IndexedDB
      try {
        const cached = await getCachedSearch(q);
        if (cached) {
          setResults(cached);
          setLoading(false);
          return;
        }
        const localResults = await searchPOIsOffline(q, 15);
        const enriched: POIResult[] = localResults.map((poi) => ({
          place_id: parseInt(poi.id.replace(/\D/g, '')) || Math.random() * 100000,
          display_name: `${poi.name}, ${poi.city || ''}, ${poi.state || ''}, ${poi.country || ''}`,
          lat: String(poi.lat),
          lon: String(poi.lon),
          type: poi.category || 'place',
          address: { road: poi.address, city: poi.city, state: poi.state, country: poi.country },
          trustScore: poi.trustScore || 70,
          validationType: (poi.trustScore || 70) >= 75 ? "source-backed" as const : "logic-backed" as const,
          contextRelevance: computeContextRelevance({ type: poi.category }, context),
          entityGravity: 60,
        }));
        setResults(enriched);
      } catch {
        setResults([]);
      }
      setLoading(false);
      return;
    }

    // ONLINE: use Nominatim API
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=15&addressdetails=1&extratags=1`,
        { headers: { "User-Agent": "SEARCH-POI/1.0" } }
      );
      const data = await resp.json();
      const enriched: POIResult[] = data.map((place: any) => {
        const { score, validationType } = computeTrustScore(place);
        const entityGravity = computeEntityGravity(place);
        const contextRelevance = computeContextRelevance(place, context);
        return {
          ...place,
          trustScore: score,
          validationType,
          contextRelevance,
          entityGravity,
        };
      });
      enriched.sort((a, b) => {
        const scoreA = a.trustScore * 0.4 + a.contextRelevance * 0.3 + a.entityGravity * 0.3;
        const scoreB = b.trustScore * 0.4 + b.contextRelevance * 0.3 + b.entityGravity * 0.3;
        return scoreB - scoreA;
      });
      setResults(enriched);
      // Cache for offline use
      cacheSearchResult(q, enriched);
    } catch {
      // Fallback to offline if network fails
      const localResults = await searchPOIsOffline(q, 15);
      const enriched: POIResult[] = localResults.map((poi) => ({
        place_id: parseInt(poi.id.replace(/\D/g, '')) || Math.random() * 100000,
        display_name: `${poi.name}, ${poi.city || ''}, ${poi.state || ''}, ${poi.country || ''}`,
        lat: String(poi.lat),
        lon: String(poi.lon),
        type: poi.category || 'place',
        address: { road: poi.address, city: poi.city, state: poi.state, country: poi.country },
        trustScore: poi.trustScore || 70,
        validationType: (poi.trustScore || 70) >= 75 ? "source-backed" as const : "logic-backed" as const,
        contextRelevance: computeContextRelevance({ type: poi.category }, context),
        entityGravity: 60,
      }));
      setResults(enriched);
    }
    setLoading(false);
  }, [context]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-16 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="glass rounded-2xl border border-border/30 w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-sm">POI Discovery Engine</h2>
                <p className="text-[10px] text-muted-foreground">Trust-verified • Context-aware • Predictive</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Context Indicator */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/30 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {context.timeOfDay} • {context.dayOfWeek}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar with Predictive (ZLO) */}
          <div className="p-4 border-b border-border/30 shrink-0">
            <form onSubmit={(e) => { e.preventDefault(); searchPOI(query); setShowPredictions(false); }} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setShowPredictions(true); }}
                    onFocus={() => setShowPredictions(true)}
                    onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
                    placeholder="Search places, businesses, landmarks..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                    autoFocus
                  />
                  {predictLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primary" />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  Discover
                </button>
              </div>

              {/* Predictive Suggestions */}
              {showPredictions && predictions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 right-0 mt-1 glass rounded-xl border border-border/30 overflow-hidden z-10"
                >
                  {predictions.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => { setQuery(p); searchPOI(p); setShowPredictions(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-secondary/30 transition-colors text-left"
                    >
                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{p}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </form>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                onClick={() => setShowContext(!showContext)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${showContext ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
              >
                <Thermometer className="w-3 h-3" /> Context
              </button>
              <button
                onClick={() => setShowTrust(!showTrust)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${showTrust ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
              >
                <Shield className="w-3 h-3" /> Trust View
              </button>
              <button
                onClick={() => setShowMemory(!showMemory)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${showMemory ? "bg-primary/20 text-primary" : "bg-secondary/30 text-muted-foreground hover:text-foreground"}`}
              >
                <Brain className="w-3 h-3" /> Memory
              </button>
              <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                <Navigation className="w-3 h-3" />
                OpenStreetMap
              </span>
            </div>
          </div>

          {/* Context Panel */}
          {showContext && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-b border-border/30 overflow-hidden shrink-0">
              <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2 rounded-lg bg-secondary/20 text-center">
                  <Clock className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Time</p>
                  <p className="text-xs font-medium text-foreground capitalize">{context.timeOfDay}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/20 text-center">
                  <Star className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Day</p>
                  <p className="text-xs font-medium text-foreground">{context.dayOfWeek}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/20 text-center">
                  <Cloud className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Season</p>
                  <p className="text-xs font-medium text-foreground capitalize">{context.season}</p>
                </div>
                <div className="p-2 rounded-lg bg-secondary/20 text-center">
                  <TrendingUp className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />
                  <p className="text-[10px] text-muted-foreground">Weekend</p>
                  <p className="text-xs font-medium text-foreground">{context.isWeekend ? "Yes" : "No"}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Memory Panel (MMO) */}
          {showMemory && memory.length > 0 && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="border-b border-border/30 overflow-hidden shrink-0">
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Recent Searches (Multi-Memory)</p>
                <div className="flex flex-wrap gap-1">
                  {memory.slice(0, 8).map((m, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(m); searchPOI(m); }}
                      className="px-2 py-1 rounded-lg bg-secondary/30 text-xs text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {m.length > 30 ? m.slice(0, 30) + "…" : m}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Discovering & verifying POIs...</p>
                <p className="text-[10px] text-muted-foreground mt-1">Running Trust Engine + Context Analysis</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {query ? "No places found. Try a different search." : "Enter a location to discover POIs."}
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {results.map((poi) => (
                  <motion.div
                    key={poi.place_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 hover:bg-secondary/10 transition-colors cursor-pointer"
                    onClick={() => setSelectedPOI(selectedPOI?.place_id === poi.place_id ? null : poi)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{poi.display_name}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{poi.type?.replace(/_/g, " ")}</p>

                        {/* Trust & Scores Row */}
                        {showTrust && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              poi.trustScore >= 75 ? "bg-[hsl(142,70%,50%)]/10 text-[hsl(142,70%,50%)]" :
                              poi.trustScore >= 55 ? "bg-yellow-500/10 text-yellow-500" :
                              "bg-destructive/10 text-destructive"
                            }`}>
                              {poi.trustScore >= 75 ? <CheckCircle2 className="w-3 h-3" /> :
                               poi.trustScore >= 55 ? <Eye className="w-3 h-3" /> :
                               <AlertTriangle className="w-3 h-3" />}
                              Trust: {poi.trustScore}%
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/30 text-muted-foreground capitalize">
                              {poi.validationType}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Gravity: {poi.entityGravity}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/30 text-muted-foreground">
                              Context: {poi.contextRelevance}%
                            </span>
                          </div>
                        )}

                        {/* Expanded Details */}
                        {selectedPOI?.place_id === poi.place_id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://www.openstreetmap.org/?mlat=${poi.lat}&mlon=${poi.lon}#map=16/${poi.lat}/${poi.lon}`, "_blank");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open Map
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://www.google.com/maps?q=${poi.lat},${poi.lon}`, "_blank");
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/30 text-foreground text-xs font-medium hover:bg-secondary/50 transition-colors"
                              >
                                <Navigation className="w-3 h-3" />
                                Google Maps
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              📍 {Number(poi.lat).toFixed(4)}, {Number(poi.lon).toFixed(4)}
                              {poi.address?.city && ` • ${poi.address.city}`}
                              {poi.address?.state && `, ${poi.address.state}`}
                              {poi.address?.country && ` • ${poi.address.country}`}
                            </p>

                            {/* ICS Reasoning for this POI */}
                            <div className="p-2 rounded-lg bg-secondary/10 border border-border/20 space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ICS Reasoning</p>
                              <p className="text-[10px] text-foreground">
                                <strong>Intent:</strong> Searching for "{query}" — location-based discovery
                              </p>
                              <p className="text-[10px] text-foreground">
                                <strong>Context:</strong> {context.timeOfDay} on {context.dayOfWeek}, {context.season} season
                              </p>
                              <p className="text-[10px] text-foreground">
                                <strong>Synthesis:</strong> {poi.validationType === "source-backed" ? "High confidence — verified against multiple data points" :
                                poi.validationType === "logic-backed" ? "Moderate confidence — partial data available" : "Low confidence — limited verification possible"}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Score badge */}
                      <div className="shrink-0 text-right">
                        <div className={`text-lg font-bold ${
                          poi.trustScore >= 75 ? "text-[hsl(142,70%,50%)]" :
                          poi.trustScore >= 55 ? "text-yellow-500" : "text-destructive"
                        }`}>
                          {poi.trustScore}
                        </div>
                        <p className="text-[9px] text-muted-foreground">trust</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border/30 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
            <span>SEARCH-POI Discovery Engine • {results.length} POIs found</span>
            <span>TTO + CEO + MMO Active</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper: Context relevance scoring
function computeContextRelevance(place: any, context: ContextSignals): number {
  let score = 50;
  const type = (place.type || "").toLowerCase();
  const name = (place.display_name || "").toLowerCase();

  // Time-based relevance
  if (context.timeOfDay === "morning") {
    if (type.includes("cafe") || type.includes("restaurant") || type.includes("bakery")) score += 20;
  } else if (context.timeOfDay === "evening" || context.timeOfDay === "night") {
    if (type.includes("restaurant") || type.includes("bar") || type.includes("hotel")) score += 20;
  } else if (context.timeOfDay === "afternoon") {
    if (type.includes("shop") || type.includes("market") || type.includes("mall")) score += 15;
  }

  // Weekend boost for leisure
  if (context.isWeekend) {
    if (type.includes("park") || type.includes("beach") || type.includes("cinema") || type.includes("museum")) score += 15;
  }

  // Rainy season adjustments
  if (context.season === "rainy") {
    if (type.includes("indoor") || type.includes("mall") || type.includes("cinema")) score += 10;
  }

  return Math.min(Math.round(score), 100);
}

export default POIDiscoveryEngine;

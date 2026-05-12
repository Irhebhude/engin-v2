import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, ExternalLink, Search, X } from "lucide-react";

interface LocationResult {
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
}

interface LocationSearchProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const LocationSearch = ({ isOpen, onClose, initialQuery = "" }: LocationSearchProps) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<LocationResult | null>(null);

  const searchPlaces = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=10&addressdetails=1`,
        { headers: { "User-Agent": "SEARCH-POI/1.0" } }
      );
      const data = await resp.json();
      setResults(data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const openInMap = (lat: string, lon: string) => {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="glass rounded-2xl border border-border/30 w-full max-w-2xl max-h-[70vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-border/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Location Search</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary/50 text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search input */}
          <div className="p-4 border-b border-border/30">
            <form onSubmit={(e) => { e.preventDefault(); searchPlaces(query); }} className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for places, restaurants, landmarks..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-sm"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Navigation className="w-3 h-3" />
              Powered by OpenStreetMap — Free, open-source maps
            </p>
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[45vh] divide-y divide-border/20">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Searching places...</p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {query ? "No places found. Try a different search." : "Enter a location to search."}
              </div>
            ) : (
              results.map((place) => (
                <motion.div
                  key={place.place_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 hover:bg-secondary/20 transition-colors cursor-pointer"
                  onClick={() => setSelectedPlace(selectedPlace?.place_id === place.place_id ? null : place)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{place.display_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{place.type?.replace(/_/g, " ")}</p>
                      {selectedPlace?.place_id === place.place_id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 flex items-center gap-2"
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); openInMap(place.lat, place.lon); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open in Map
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {Number(place.lat).toFixed(4)}, {Number(place.lon).toFixed(4)}
                          </span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LocationSearch;

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NexusPanel from "./NexusPanel";

interface IntelItem {
  id: string;
  title: string;
  domain: string;
  content: string;
  anomaly: boolean;
  created_at: string;
}

const DOMAIN_COLORS: Record<string, string> = {
  WEB: "#00FFE7",
  SCIENCE: "#BF5AF2",
  FINANCE: "#30D158",
  GEO: "#FF6B35",
  TECH: "#FFD60A",
};

export default function OmegaIntelFeed() {
  const [items, setItems] = useState<IntelItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let alive = true;
    const fetchFeed = async () => {
      if (!alive) return;
      setRefreshing(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-intel-feed`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        const j = await res.json();
        if (alive && j.items) setItems(j.items);
      } catch {}
      finally { if (alive) setRefreshing(false); }
    };
    fetchFeed();
    const id = setInterval(fetchFeed, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <NexusPanel title="OMEGA INTEL FEED" accent="#FF6B35" icon="◉" active={refreshing}>
      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <div className="text-center py-10 text-xs text-orange-300/40">Scanning global signals…</div>
          )}
          {items.map((item) => {
            const color = DOMAIN_COLORS[item.domain] ?? "#00FFE7";
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg p-3 border relative"
                style={{
                  background: item.anomaly ? "rgba(255,59,59,0.06)" : "rgba(255,255,255,0.02)",
                  borderColor: item.anomaly ? "rgba(255,59,59,0.4)" : `${color}25`,
                }}
              >
                {item.anomaly && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(255,59,59,0.2)", color: "#FF3B3B", fontFamily: "'Orbitron', sans-serif" }}
                  >
                    <AlertTriangle className="w-2.5 h-2.5" /> ANOMALY
                  </motion.div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: `${color}20`, color, fontFamily: "'Orbitron', sans-serif" }}
                  >
                    [{item.domain}]
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-cyan-50 mb-1 pr-16" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  {item.title}
                </h4>
                <p className="text-[11px] text-cyan-100/60 line-clamp-2">{item.content}</p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </NexusPanel>
  );
}

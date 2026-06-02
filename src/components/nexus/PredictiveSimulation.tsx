import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import NexusPanel from "./NexusPanel";

interface Scenario {
  probability: number;
  outcomes: string[];
  timeline: { year: string; event: string }[];
  cascadeEffects: string[];
}
interface ScenarioSet {
  optimistic: Scenario;
  realistic: Scenario;
  catastrophic: Scenario;
}

const SCENARIOS: Array<{ key: keyof ScenarioSet; label: string; color: string }> = [
  { key: "optimistic", label: "OPTIMISTIC", color: "#30D158" },
  { key: "realistic", label: "REALISTIC", color: "#00FFE7" },
  { key: "catastrophic", label: "CATASTROPHIC", color: "#FF3B3B" },
];

export default function PredictiveSimulation({ topic, trigger }: { topic: string; trigger: boolean }) {
  const [data, setData] = useState<ScenarioSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [tl, setTl] = useState(50);

  useEffect(() => {
    if (!trigger || !topic.trim()) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-simulate`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ topic }),
        });
        const j = await res.json();
        if (alive && j.optimistic) setData(j);
      } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [trigger, topic]);

  return (
    <NexusPanel title="PREDICTIVE SIMULATION" accent="#BF5AF2" icon="◈" active={loading}>
      {!data ? (
        <div className="text-center py-10 text-xs text-violet-300/40">
          {loading ? "Modeling timelines…" : "Run a mission to project scenarios."}
        </div>
      ) : (
        <div className="space-y-3">
          {SCENARIOS.map((s) => {
            const sc = data[s.key];
            return (
              <div
                key={s.key}
                className="rounded-lg p-2.5 border"
                style={{ borderColor: `${s.color}40`, background: `${s.color}08` }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: s.color, fontFamily: "'Orbitron', sans-serif" }}>
                    {s.label}
                  </span>
                  <span className="text-xs font-bold" style={{ color: s.color }}>{Math.round(sc.probability)}%</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 mb-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sc.probability}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
                  />
                </div>
                <ul className="text-[10px] text-cyan-100/70 space-y-0.5">
                  {sc.outcomes.slice(0, 2).map((o, i) => <li key={i}>• {o}</li>)}
                </ul>
                {sc.cascadeEffects?.length > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-white/5 text-[9px] text-cyan-100/40 italic">
                    ↳ {sc.cascadeEffects[0]}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-1">
            <div className="flex items-center justify-between text-[9px] text-violet-300/60 mb-1" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              <span>PAST</span><span>PRESENT</span><span>FUTURE</span>
            </div>
            <input type="range" min={0} max={100} value={tl} onChange={(e) => setTl(+e.target.value)} className="w-full accent-[#BF5AF2]" />
          </div>
        </div>
      )}
    </NexusPanel>
  );
}

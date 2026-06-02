import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Brain, Activity, Zap, GitBranch, Sparkles, Copy, Save, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import NexusScanLine from "@/components/nexus/NexusScanLine";
import AgentCommandPanel, { type AgentTask } from "@/components/nexus/AgentCommandPanel";
import OmegaIntelFeed from "@/components/nexus/OmegaIntelFeed";
import PredictiveSimulation from "@/components/nexus/PredictiveSimulation";
import MultiAIOrchestra, { type OrchestraAgent } from "@/components/nexus/MultiAIOrchestra";
import SynthesizerOutput from "@/components/nexus/SynthesizerOutput";

const AGENT_NAMES = ["analyst", "strategist", "critic", "futurist"] as const;

export default function NexusCore() {
  const { user } = useAuth();
  const [mission, setMission] = useState("");
  const [running, setRunning] = useState(false);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [agents, setAgents] = useState<OrchestraAgent[]>(
    AGENT_NAMES.map((n) => ({ name: n, status: "queued", output: "" }))
  );
  const [synthesizer, setSynthesizer] = useState<{ output: string; confidence: number } | null>(null);
  const [synthStreaming, setSynthStreaming] = useState(false);
  const [knowledgeDepth, setKnowledgeDepth] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Knowledge depth counter
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase.from("nexus_memory").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      setKnowledgeDepth(count ?? 0);
    };
    load();
  }, [user, synthesizer]);

  async function initiateMission() {
    if (!mission.trim()) return;
    if (!user) {
      toast.error("Sign in to launch a mission");
      return;
    }
    setRunning(true);
    setSynthesizer(null);
    setSynthStreaming(false);
    setTasks(
      AGENT_NAMES.map((n) => ({ id: n, name: `${n[0].toUpperCase() + n.slice(1)} sub-task`, agent: n, status: "queued", progress: 0 }))
    );
    setAgents(AGENT_NAMES.map((n) => ({ name: n, status: "queued", output: "" })));

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nexus-orchestrate`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mission, user_id: user.id }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Failed: ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          try {
            const ev = JSON.parse(json);
            handleEvent(ev);
          } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message ?? "Mission failed");
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(ev: any) {
    switch (ev.type) {
      case "agent_start":
        setTasks((prev) => prev.map((t) => t.agent === ev.agent ? { ...t, status: "running", progress: 35 } : t));
        setAgents((prev) => prev.map((a) => a.name === ev.agent ? { ...a, status: "running" } : a));
        break;
      case "agent_done":
        setTasks((prev) => prev.map((t) => t.agent === ev.agent ? { ...t, status: "complete", progress: 100 } : t));
        setAgents((prev) => prev.map((a) => a.name === ev.agent ? { ...a, status: "complete", output: ev.output } : a));
        break;
      case "agent_error":
        setTasks((prev) => prev.map((t) => t.agent === ev.agent ? { ...t, status: "failed", progress: 100 } : t));
        setAgents((prev) => prev.map((a) => a.name === ev.agent ? { ...a, status: "failed", output: ev.error } : a));
        break;
      case "synthesizer_start":
        setSynthStreaming(true);
        break;
      case "synthesizer_done":
        setSynthesizer({ output: ev.output, confidence: ev.confidence ?? 75 });
        setSynthStreaming(false);
        toast.success("Synthesis complete");
        break;
      case "synthesizer_error":
        setSynthStreaming(false);
        toast.error("Synthesizer failed");
        break;
    }
  }

  async function saveToMemory() {
    if (!synthesizer || !user) return;
    await supabase.from("nexus_memory").insert({
      user_id: user.id,
      insight: synthesizer.output.slice(0, 1000),
      domain: "mission",
      confidence: synthesizer.confidence,
    });
    toast.success("Saved to Memory Core");
    setKnowledgeDepth((k) => k + 1);
  }

  return (
    <div
      className="min-h-screen text-foreground relative overflow-x-hidden"
      style={{ background: "#020810", fontFamily: "'Space Mono', monospace" }}
    >
      <SEOHead title="NEXUS CORE — Omega Intelligence System" description="Live multi-agent intelligence command center." />
      <NexusScanLine />

      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 backdrop-blur-xl border-b"
        style={{ background: "rgba(2,8,16,0.85)", borderColor: "rgba(0,255,231,0.2)" }}
      >
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-cyan-300/70 hover:text-cyan-300">
                <ArrowLeft className="w-3.5 h-3.5" /> SEARCH-POI
              </Link>
              <h1
                className="text-lg sm:text-2xl font-bold tracking-widest nexus-glitch"
                style={{ fontFamily: "'Orbitron', sans-serif", color: "#00FFE7", textShadow: "0 0 20px rgba(0,255,231,0.6)" }}
              >
                ⬡ NEXUS CORE — OMEGA INTELLIGENCE
              </h1>
            </div>
            <div className="flex items-center gap-3 text-[10px] sm:text-xs">
              {["AGENT", "INTEL", "PREDICT", "ORCHESTRA", "MEMORY"].map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-cyan-300/80">
                  <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" /> {s}
                </span>
              ))}
              <span className="hidden sm:inline px-2 py-1 rounded border border-cyan-400/30 text-cyan-300" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                DEPTH: {knowledgeDepth}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !running && initiateMission()}
              placeholder="Enter global mission..."
              className="flex-1 min-w-[200px] h-11 px-4 rounded-lg bg-black/40 border text-sm text-cyan-100 placeholder:text-cyan-300/30 focus:outline-none focus:ring-2"
              style={{ borderColor: "rgba(0,255,231,0.3)", fontFamily: "'Space Mono', monospace" }}
            />
            <button
              onClick={initiateMission}
              disabled={running}
              className="h-11 px-5 rounded-lg font-bold tracking-wider text-sm flex items-center gap-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #00FFE7, #00b8a8)",
                color: "#020810",
                fontFamily: "'Orbitron', sans-serif",
                boxShadow: "0 0 25px rgba(0,255,231,0.5)",
              }}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "RUNNING" : "▶ INITIATE MISSION"}
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="max-w-[1800px] mx-auto p-4 sm:p-6 grid gap-4 lg:grid-cols-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="lg:col-span-6">
          <AgentCommandPanel tasks={tasks} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-6">
          <OmegaIntelFeed />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4">
          <PredictiveSimulation topic={mission} trigger={running} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-4">
          <MultiAIOrchestra agents={agents} synthStreaming={synthStreaming} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-4">
          <SynthesizerOutput data={synthesizer} streaming={synthStreaming} onSave={saveToMemory} />
        </motion.div>
      </main>

      <style>{`
        @keyframes nexus-scan {
          0% { transform: translateY(-10vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh); opacity: 0; }
        }
        @keyframes nexus-glitch-anim {
          0%, 100% { transform: translate(0); text-shadow: 0 0 20px rgba(0,255,231,0.6); }
          20% { transform: translate(-1px, 1px); text-shadow: 2px 0 #FF6B35, -2px 0 #00FFE7; }
          40% { transform: translate(1px, -1px); text-shadow: -2px 0 #BF5AF2, 2px 0 #00FFE7; }
          60% { transform: translate(0); }
        }
        .nexus-glitch { animation: nexus-glitch-anim 5s infinite; }
      `}</style>
    </div>
  );
}

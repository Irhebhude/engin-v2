import { Brain, Compass, Eye, Telescope, Sparkles, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import NexusPanel from "./NexusPanel";

export interface OrchestraAgent {
  name: string;
  status: "queued" | "running" | "complete" | "failed";
  output: string;
}

const ICONS: Record<string, any> = {
  analyst: Brain,
  strategist: Compass,
  critic: Eye,
  futurist: Telescope,
  synthesizer: Sparkles,
};

export default function MultiAIOrchestra({ agents, synthStreaming }: { agents: OrchestraAgent[]; synthStreaming: boolean }) {
  const all = [...agents, { name: "synthesizer", status: synthStreaming ? "running" : (agents.every(a => a.status === "complete") ? "queued" : "queued"), output: "" } as OrchestraAgent];
  const active = agents.some(a => a.status === "running") || synthStreaming;
  return (
    <NexusPanel title="MULTI-AI ORCHESTRA" accent="#30D158" icon="⬢" active={active}>
      <div className="space-y-2">
        {all.map((a) => {
          const Icon = ICONS[a.name] ?? Brain;
          const isRunning = a.status === "running";
          return (
            <div
              key={a.name}
              className="rounded-lg p-2.5 border flex items-start gap-2.5 transition-all"
              style={{
                borderColor: isRunning ? "rgba(48,209,88,0.5)" : "rgba(48,209,88,0.15)",
                background: isRunning ? "rgba(48,209,88,0.06)" : "rgba(48,209,88,0.02)",
                boxShadow: isRunning ? "0 0 12px rgba(48,209,88,0.25)" : "none",
              }}
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "rgba(48,209,88,0.12)", color: "#30D158" }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-50" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    {a.name}
                  </span>
                  {a.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-[#30D158]" />}
                  {a.status === "complete" && <CheckCircle2 className="w-3 h-3 text-[#30D158]" />}
                  {a.status === "failed" && <XCircle className="w-3 h-3 text-[#FF3B3B]" />}
                </div>
                <p className="text-[10px] text-cyan-100/50 line-clamp-2">
                  {a.status === "running" ? "Thinking…" : a.output ? a.output.slice(0, 110) + (a.output.length > 110 ? "…" : "") : "Standby"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </NexusPanel>
  );
}

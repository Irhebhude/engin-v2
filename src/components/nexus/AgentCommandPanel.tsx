import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import NexusPanel from "./NexusPanel";

export interface AgentTask {
  id: string;
  name: string;
  agent: string;
  status: "queued" | "running" | "complete" | "failed";
  progress: number;
}

const badge: Record<AgentTask["status"], { bg: string; text: string; label: string }> = {
  queued: { bg: "rgba(255,255,255,0.05)", text: "#9ca3af", label: "QUEUED" },
  running: { bg: "rgba(0,255,231,0.15)", text: "#00FFE7", label: "RUNNING" },
  complete: { bg: "rgba(48,209,88,0.15)", text: "#30D158", label: "COMPLETE" },
  failed: { bg: "rgba(255,59,59,0.15)", text: "#FF3B3B", label: "FAILED" },
};

export default function AgentCommandPanel({ tasks }: { tasks: AgentTask[] }) {
  return (
    <NexusPanel title="AGENT COMMAND CENTER" accent="#00FFE7" icon="⬡" active={tasks.some(t => t.status === "running")}>
      {tasks.length === 0 ? (
        <div className="text-center py-10 text-xs text-cyan-300/40">Awaiting mission directive…</div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((t) => {
            const b = badge[t.status];
            return (
              <div
                key={t.id}
                className="rounded-lg p-3 border"
                style={{ background: "rgba(0,255,231,0.03)", borderColor: "rgba(0,255,231,0.15)" }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.status === "running" && <Loader2 className="w-3.5 h-3.5 text-[#00FFE7] animate-spin shrink-0" />}
                    {t.status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-[#30D158] shrink-0" />}
                    {t.status === "failed" && <XCircle className="w-3.5 h-3.5 text-[#FF3B3B] shrink-0" />}
                    {t.status === "queued" && <Clock className="w-3.5 h-3.5 text-cyan-300/40 shrink-0" />}
                    <span className="text-xs font-semibold text-cyan-100 truncate" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                      {t.name}
                    </span>
                  </div>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider"
                    style={{ background: b.bg, color: b.text, fontFamily: "'Orbitron', sans-serif" }}
                  >
                    {b.label}
                  </span>
                </div>
                <div className="h-1 rounded-full overflow-hidden bg-white/5">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${t.progress}%`,
                      background: t.status === "failed" ? "#FF3B3B" : "linear-gradient(90deg, #00FFE7, #00b8a8)",
                    }}
                  />
                </div>
                <div className="text-[10px] text-cyan-300/50 mt-1.5">Agent: {t.agent.toUpperCase()}</div>
              </div>
            );
          })}
        </div>
      )}
    </NexusPanel>
  );
}

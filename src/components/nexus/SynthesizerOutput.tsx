import { Copy, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import NexusPanel from "./NexusPanel";

export default function SynthesizerOutput({
  data, streaming, onSave,
}: { data: { output: string; confidence: number } | null; streaming: boolean; onSave: () => void }) {
  return (
    <div className="rounded-xl backdrop-blur-md h-full flex flex-col overflow-hidden"
      style={{
        background: "rgba(2,8,16,0.7)",
        border: "1.5px solid rgba(0,255,231,0.7)",
        boxShadow: "0 0 40px rgba(0,255,231,0.4), inset 0 0 30px rgba(0,255,231,0.08)",
      }}
    >
      <div
        className="px-4 py-2.5 border-b flex items-center gap-2 text-xs font-bold tracking-widest"
        style={{ borderColor: "rgba(0,255,231,0.3)", color: "#00FFE7", fontFamily: "'Orbitron', sans-serif", background: "linear-gradient(90deg, rgba(0,255,231,0.15), transparent)" }}
      >
        ⬡ SYNTHESIZER — FINAL OUTPUT
        {data && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded" style={{ background: "rgba(0,255,231,0.15)", color: "#00FFE7" }}>
            CONFIDENCE: {data.confidence}%
          </span>
        )}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {streaming && !data && (
          <div className="flex flex-col items-center justify-center py-10 text-cyan-300/60 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Synthesizing omega-tier intelligence…</span>
          </div>
        )}
        {!data && !streaming && (
          <div className="text-center py-10 text-xs text-cyan-300/40">
            Master report appears here after all agents complete.
          </div>
        )}
        {data && (
          <>
            <div className="text-[11px] leading-relaxed text-cyan-50/90 whitespace-pre-wrap font-mono">
              {data.output}
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-cyan-400/20">
              <button
                onClick={() => { navigator.clipboard.writeText(data.output); toast.success("Copied"); }}
                className="flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold"
                style={{ background: "rgba(0,255,231,0.08)", border: "1px solid rgba(0,255,231,0.3)", color: "#00FFE7", fontFamily: "'Orbitron', sans-serif" }}
              >
                <Copy className="w-3.5 h-3.5" /> COPY
              </button>
              <button
                onClick={onSave}
                className="flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold"
                style={{ background: "linear-gradient(135deg, #00FFE7, #00b8a8)", color: "#020810", fontFamily: "'Orbitron', sans-serif" }}
              >
                <Save className="w-3.5 h-3.5" /> SAVE TO MEMORY
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

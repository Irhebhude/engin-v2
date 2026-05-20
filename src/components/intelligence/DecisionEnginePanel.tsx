import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { deriveDecision } from "@/lib/intelligence-derive";
import type { SourceRef } from "@/components/SourceCitations";

interface Props { query: string; answer: string; sources: SourceRef[]; }

const DecisionEnginePanel = ({ query, answer, sources }: Props) => {
  const [open, setOpen] = useState(false);
  const d = useMemo(() => deriveDecision(query, answer, sources), [query, answer, sources]);

  const color =
    d.verdict === "Yes" ? "text-[hsl(142,70%,50%)] border-[hsl(142,70%,50%)]"
    : d.verdict === "No" ? "text-red-400 border-red-400"
    : d.verdict === "Insufficient Data" ? "text-muted-foreground border-border"
    : "text-yellow-400 border-yellow-400";

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Gauge className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Decision Engine</span>
        <span className={`ml-auto px-1.5 py-0.5 rounded text-[10px] font-bold border ${color}`}>
          {d.verdict} · {d.score}/100
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 overflow-hidden"
        >
          <div className="mb-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Against</span><span>Decision score</span><span>For</span>
            </div>
            <div className="relative h-2 rounded-full bg-secondary/40 overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-400/60 via-yellow-400/60 to-[hsl(142,70%,50%)]" style={{ width: "100%" }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-foreground" style={{ left: `${d.score}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(142,70%,50%)] mb-2">
                <ThumbsUp className="w-3 h-3" /> Pros
              </div>
              <div className="space-y-1.5">
                {d.pros.length > 0 ? d.pros.map((p, i) => (
                  <div key={i} className="p-2 rounded bg-[hsl(142,70%,50%)]/5 border border-[hsl(142,70%,50%)]/20 text-[11px] text-foreground">
                    <div className="text-[9px] text-muted-foreground mb-0.5">Weight {p.weight}</div>
                    {p.text}
                  </div>
                )) : <div className="text-[11px] text-muted-foreground italic">No explicit pros detected.</div>}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-2">
                <ThumbsDown className="w-3 h-3" /> Cons
              </div>
              <div className="space-y-1.5">
                {d.cons.length > 0 ? d.cons.map((c, i) => (
                  <div key={i} className="p-2 rounded bg-red-400/5 border border-red-400/20 text-[11px] text-foreground">
                    <div className="text-[9px] text-muted-foreground mb-0.5">Weight {c.weight}</div>
                    {c.text}
                  </div>
                )) : <div className="text-[11px] text-muted-foreground italic">No explicit cons detected.</div>}
              </div>
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-primary/10 border border-primary/30 text-[11px] text-foreground">
            <span className="font-semibold text-primary">Recommendation: </span>{d.recommendation}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DecisionEnginePanel;

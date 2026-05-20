import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, ChevronDown, ChevronUp, Target, Scale, AlertTriangle } from "lucide-react";
import { deriveReasoning } from "@/lib/intelligence-derive";
import type { SourceRef } from "@/components/SourceCitations";

interface Props {
  query: string;
  answer: string;
  sources: SourceRef[];
}

const ReasoningTransparencyPanel = ({ query, answer, sources }: Props) => {
  const [open, setOpen] = useState(false);
  const data = useMemo(() => deriveReasoning(query, answer, sources), [query, answer, sources]);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Eye className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Reasoning Transparency</span>
        <span className="ml-auto text-[10px] text-primary font-semibold">
          {data.evidence.length} evidence · {data.assumptions.length} assumptions
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 space-y-4 overflow-hidden"
        >
          <div className="flex items-start gap-2">
            <Target className="w-3.5 h-3.5 text-primary mt-0.5" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Intent</div>
              <div className="text-xs text-foreground">{data.intent}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Evidence weighting
            </div>
            <div className="space-y-1.5">
              {data.evidence.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="w-32 truncate text-muted-foreground">{e.source}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary/40 overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${e.weight}%` }} />
                  </div>
                  <span className="w-8 text-right text-primary font-semibold">{e.weight}</span>
                </div>
              ))}
              {data.evidence.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic">No source-weighted evidence.</div>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Scale className="w-3 h-3" /> Confidence breakdown
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.confidenceBreakdown.map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-background/30 border border-border/20">
                  <div className="text-[10px] text-muted-foreground">{c.label}</div>
                  <div className="text-sm font-bold text-primary">{c.value}%</div>
                </div>
              ))}
            </div>
          </div>

          {data.assumptions.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Assumptions
              </div>
              <ul className="text-[11px] text-foreground space-y-0.5 list-disc ml-4">
                {data.assumptions.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-yellow-400" /> Limitations
            </div>
            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc ml-4">
              {data.limitations.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReasoningTransparencyPanel;

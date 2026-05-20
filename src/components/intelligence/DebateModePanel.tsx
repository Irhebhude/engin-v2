import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, ChevronDown, ChevronUp, AlertOctagon } from "lucide-react";
import { deriveDebate } from "@/lib/intelligence-derive";

interface Props { query: string; answer: string; }

const DebateModePanel = ({ query, answer }: Props) => {
  const [open, setOpen] = useState(false);
  const { views, fallacies } = useMemo(() => deriveDebate(query, answer), [query, answer]);
  const forViews = views.filter((v) => v.side === "For");
  const againstViews = views.filter((v) => v.side === "Against");

  const sevColor = (s: string) =>
    s === "high" ? "bg-red-400/15 text-red-400 border-red-400/40"
    : s === "medium" ? "bg-yellow-400/15 text-yellow-400 border-yellow-400/40"
    : "bg-primary/10 text-primary border-primary/30";

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <MessageSquare className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Debate Mode + Fallacy Detector</span>
        <span className="ml-auto text-[10px] text-primary font-semibold">
          {forViews.length} for · {againstViews.length} against · {fallacies.length} fallacies
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 space-y-3 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(142,70%,50%)] mb-2">For</div>
              <div className="space-y-1.5">
                {forViews.map((v, i) => (
                  <div key={i} className="p-2 rounded bg-[hsl(142,70%,50%)]/5 border border-[hsl(142,70%,50%)]/20 text-[11px] text-foreground">
                    <div className="text-[9px] text-muted-foreground mb-0.5">Strength {v.strength}</div>
                    {v.point}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-red-400 mb-2">Against</div>
              <div className="space-y-1.5">
                {againstViews.map((v, i) => (
                  <div key={i} className="p-2 rounded bg-red-400/5 border border-red-400/20 text-[11px] text-foreground">
                    <div className="text-[9px] text-muted-foreground mb-0.5">Strength {v.strength}</div>
                    {v.point}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <AlertOctagon className="w-3 h-3" /> Detected fallacies
            </div>
            {fallacies.length === 0 ? (
              <div className="text-[11px] text-muted-foreground italic">No common fallacies detected in the answer.</div>
            ) : (
              <div className="space-y-1.5">
                {fallacies.map((f, i) => (
                  <div key={i} className={`p-2 rounded border text-[11px] ${sevColor(f.severity)}`}>
                    <div className="font-bold mb-0.5">{f.name} <span className="text-[9px] opacity-70">· {f.severity}</span></div>
                    <div className="text-foreground/80 italic">"{f.excerpt}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DebateModePanel;

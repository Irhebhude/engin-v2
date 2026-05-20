import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Waves, ChevronDown, ChevronUp } from "lucide-react";
import { deriveSecondOrderEffects } from "@/lib/intelligence-derive";

interface Props { query: string; answer: string; }

const SecondOrderEffectsPanel = ({ query, answer }: Props) => {
  const [open, setOpen] = useState(false);
  const effects = useMemo(() => deriveSecondOrderEffects(query, answer), [query, answer]);

  const impactColor = (i: string) =>
    i === "High" ? "text-red-400 bg-red-400/10"
    : i === "Medium" ? "text-yellow-400 bg-yellow-400/10"
    : "text-primary bg-primary/10";

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Waves className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Second-Order Effects</span>
        <span className="ml-auto text-[10px] text-primary font-semibold">{effects.length} ripples</span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 space-y-2 overflow-hidden"
        >
          {effects.map((e, i) => (
            <div key={i} className="p-3 rounded-lg bg-background/30 border border-border/20">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{e.horizon}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${impactColor(e.impact)}`}>
                  {e.impact} impact
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">{e.likelihood}% likelihood</span>
              </div>
              <div className="text-xs text-foreground">{e.text}</div>
              <div className="mt-1.5 h-1 rounded-full bg-secondary/40 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${e.likelihood}%` }} />
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default SecondOrderEffectsPanel;

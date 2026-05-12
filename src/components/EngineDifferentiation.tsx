import { motion } from "framer-motion";
import { Brain, Cpu, MapPin, BarChart3, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface EngineDifferentiationProps {
  query: string;
  confidence: number;
}

const DIFFERENTIATORS = [
  { icon: MapPin, label: "Location-based reasoning", desc: "Analyzes geographic context, foot traffic, and local market signals — not just text prediction" },
  { icon: BarChart3, label: "Market signal synthesis", desc: "Combines pricing data, demand trends, and competitor presence into actionable intelligence" },
  { icon: Cpu, label: "Execution-ready outputs", desc: "Generates step-by-step action plans with cost breakdowns — not just answers" },
  { icon: Brain, label: "Multi-step reasoning", desc: "5-stage pipeline: Parse → Retrieve → Validate → Synthesize → Score" },
];

const EngineDifferentiation = ({ query, confidence }: EngineDifferentiationProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 rounded-xl border border-border/20 bg-secondary/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-secondary/20 transition-colors"
      >
        <Zap className="w-3 h-3 text-primary" />
        <span className="font-semibold text-foreground">ENGINE DIFFERENTIATION</span>
        <span className="text-[10px] ml-1">SEARCH-POI vs Standard AI</span>
        <span className="ml-auto flex items-center gap-1 text-primary font-semibold text-[10px]">
          {confidence}% confidence
        </span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="px-4 pb-3 space-y-2"
        >
          {DIFFERENTIATORS.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">{d.label}</span>
                  <span className="text-muted-foreground ml-1">— {d.desc}</span>
                </div>
              </div>
            );
          })}
          <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground">
            💡 Standard AI chatbots use single-pass text prediction. SEARCH-POI uses a multi-source reasoning pipeline with real-time data validation.
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EngineDifferentiation;

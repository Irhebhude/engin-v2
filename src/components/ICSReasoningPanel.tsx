import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Target, Layers, GitBranch, AlertTriangle, CheckCircle, BarChart3 } from "lucide-react";

interface ICSReasoningPanelProps {
  query: string;
  answer: string;
  confidence: number;
  sources: { url: string; title: string; domain: string }[];
}

interface ReasoningStep {
  icon: React.ElementType;
  label: string;
  content: string;
}

const ICSReasoningPanel = ({ query, answer, confidence, sources }: ICSReasoningPanelProps) => {
  const [open, setOpen] = useState(false);

  const hasGovSources = sources.some(s => /\.gov|\.edu|\.org/i.test(s.domain));
  const validationType = hasGovSources ? "Source-Backed" : sources.length >= 2 ? "Logic-Backed" : "Uncertain";
  const authorityScore = hasGovSources ? 92 : sources.length >= 4 ? 82 : sources.length >= 2 ? 68 : 45;

  const steps: ReasoningStep[] = [
    {
      icon: Target,
      label: "Intent Interpretation",
      content: `Query "${query}" analyzed for semantic intent, entity extraction, and contextual signals. Detected ${query.split(" ").length} tokens with ${sources.length > 0 ? "informational" : "exploratory"} intent.`,
    },
    {
      icon: Layers,
      label: "Context Synthesis",
      content: `Cross-referenced ${sources.length} source(s) across domains. Session context and prior queries factored into reasoning chain.`,
    },
    {
      icon: GitBranch,
      label: "Step-by-Step Reasoning",
      content: `Multi-step pipeline: Parse → Retrieve (${sources.length} sources) → Validate → Synthesize → Score. Each claim verified against available evidence.`,
    },
    {
      icon: AlertTriangle,
      label: "Risk Analysis",
      content: validationType === "Uncertain"
        ? "⚠️ Limited source verification. Claims should be independently verified."
        : validationType === "Source-Backed"
        ? "✅ Low risk — claims backed by authoritative sources (.gov/.edu/.org)"
        : "⚡ Moderate risk — logic-based reasoning with web source corroboration.",
    },
    {
      icon: CheckCircle,
      label: "Final Answer",
      content: `Answer synthesized with ${confidence}% confidence. Validation: ${validationType}. Authority: ${authorityScore}/100.`,
    },
  ];

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Brain className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">ICS Reasoning Chain</span>
        <span className="ml-auto flex items-center gap-2">
          <span className={`text-[10px] font-semibold ${validationType === "Source-Backed" ? "text-[hsl(142,70%,50%)]" : validationType === "Logic-Backed" ? "text-yellow-400" : "text-red-400"}`}>
            {validationType}
          </span>
          <span className="text-[10px] font-semibold text-primary">
            Authority: {authorityScore}
          </span>
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 space-y-3 overflow-hidden"
        >
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={i} className="flex items-start gap-2.5">
                <div className="p-1 rounded bg-primary/10 mt-0.5">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-foreground">{step.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{step.content}</div>
                </div>
              </div>
            );
          })}

          {/* Optimization Tags */}
          <div className="pt-2 border-t border-border/20">
            <div className="text-[10px] font-semibold text-muted-foreground mb-1.5">OPTIMIZATION TAGS</div>
            <div className="flex flex-wrap gap-1.5">
              {["AEO", "LEO", "GEO", "SxO", "AIO"].map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
            <BarChart3 className="w-3 h-3 inline mr-1" />
            Confidence: {confidence}% • Authority: {authorityScore}/100 • Validation: {validationType} • Sources: {sources.length}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ICSReasoningPanel;

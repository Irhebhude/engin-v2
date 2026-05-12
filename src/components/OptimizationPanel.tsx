import { useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown, ChevronUp, Globe, Smartphone, Video, MessageSquare,
  Search, Zap, Users, MonitorSmartphone, HelpCircle, Brain, FileText
} from "lucide-react";

interface OptimizationPanelProps {
  query: string;
  answer: string;
}

interface OptEngine {
  id: string;
  label: string;
  fullName: string;
  icon: React.ElementType;
  color: string;
  tips: string[];
}

const ENGINES: OptEngine[] = [
  {
    id: "aeo", label: "AEO", fullName: "Answer Engine Optimization",
    icon: Search, color: "text-blue-400",
    tips: [
      "Structure answers in direct Q&A format for featured snippets",
      "Lead with a concise one-sentence answer before elaboration",
      "Use schema markup (FAQPage, HowTo) for rich results",
    ],
  },
  {
    id: "leo", label: "LEO", fullName: "LLM Search Optimization",
    icon: Brain, color: "text-purple-400",
    tips: [
      "Ensure machine-readable, citation-friendly output format",
      "Minimize ambiguity — use precise claims with confidence scores",
      "Structure for multi-model compatibility (GPT, Gemini, Claude)",
    ],
  },
  {
    id: "smo", label: "SMO", fullName: "Social Media Optimization",
    icon: MessageSquare, color: "text-pink-400",
    tips: [
      "Generate viral-ready hooks from key insights",
      "Suggest platform-specific hashtag strategies",
      "Optimize for engagement: polls, threads, carousel formats",
    ],
  },
  {
    id: "vso", label: "VSO", fullName: "Video Search Optimization",
    icon: Video, color: "text-red-400",
    tips: [
      "Generate optimized video titles with high CTR keywords",
      "Structure descriptions with timestamps and key moments",
      "Suggest tags aligned with YouTube search algorithms",
    ],
  },
  {
    id: "aso", label: "ASO", fullName: "App Store Optimization",
    icon: Smartphone, color: "text-green-400",
    tips: [
      "Map primary + secondary keywords for app store ranking",
      "Optimize title (30 chars) and subtitle (30 chars) structure",
      "Analyze competitor keyword density and ranking signals",
    ],
  },
  {
    id: "pso", label: "PSO", fullName: "Platform Search Optimization",
    icon: MonitorSmartphone, color: "text-orange-400",
    tips: [
      "Optimize for YouTube, TikTok, and Google Discover algorithms",
      "Tailor content format per platform's ranking signals",
      "Cross-platform keyword consistency for discovery",
    ],
  },
  {
    id: "sxo", label: "SxO", fullName: "Search Experience Optimization",
    icon: Zap, color: "text-cyan-400",
    tips: [
      "Reduce cognitive load with structured summaries",
      "Use bullet points and clear headings for scannability",
      "Provide interactive result formatting with expandable sections",
    ],
  },
  {
    id: "paa", label: "PAA", fullName: "People Also Ask Optimization",
    icon: HelpCircle, color: "text-yellow-400",
    tips: [
      "Generate related question clusters from query intent",
      "Structure answers for snippet capture (40–60 words)",
      "Map intent expansion for comprehensive topic coverage",
    ],
  },
  {
    id: "ugc", label: "UGC", fullName: "User Generated Content Optimization",
    icon: Users, color: "text-emerald-400",
    tips: [
      "Identify trending discussion topics from user behavior",
      "Suggest high-value content ideas for community engagement",
      "Structure UGC for search ranking potential",
    ],
  },
  {
    id: "geo", label: "GEO", fullName: "Generative Engine Optimization",
    icon: Globe, color: "text-primary",
    tips: [
      "Ensure all outputs are JSON-ready for AI consumption",
      "Generate crawlable public pages with schema markup",
      "API-ready structured responses for external AI systems",
    ],
  },
  {
    id: "aio", label: "AIO", fullName: "AI Optimization Layer",
    icon: FileText, color: "text-indigo-400",
    tips: [
      "Cross-model readability — works across GPT, Gemini, Claude",
      "Reasoning clarity with source trust alignment",
      "Multi-model compatibility ensures universal discoverability",
    ],
  },
];

const OptimizationPanel = ({ query, answer }: OptimizationPanelProps) => {
  const [open, setOpen] = useState(false);
  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);

  if (!answer) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Multi-Platform Optimization</span>
        <span className="ml-auto text-[10px] text-primary font-semibold">
          {ENGINES.length} Engines Active
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-3 rounded-xl bg-secondary/20 border border-border/20 space-y-1.5 overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ENGINES.map(e => (
              <span key={e.id} className={`px-2 py-0.5 rounded-full bg-secondary/40 text-[9px] font-bold ${e.color}`}>
                {e.label}
              </span>
            ))}
          </div>

          {ENGINES.map(engine => {
            const Icon = engine.icon;
            const isExpanded = expandedEngine === engine.id;
            return (
              <div key={engine.id} className="rounded-lg bg-secondary/30 overflow-hidden">
                <button
                  onClick={() => setExpandedEngine(isExpanded ? null : engine.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-secondary/50 transition-colors"
                >
                  <Icon className={`w-3.5 h-3.5 ${engine.color}`} />
                  <span className="font-semibold text-foreground">{engine.label}</span>
                  <span className="text-muted-foreground">— {engine.fullName}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>
                {isExpanded && (
                  <div className="px-3 pb-2.5 space-y-1">
                    {engine.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
            🔗 All optimization engines work together — Truth Engine validates, ICS structures, GEO ensures AI discoverability.
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default OptimizationPanel;

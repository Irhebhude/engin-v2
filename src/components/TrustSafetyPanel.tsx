import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { motion } from "framer-motion";
import type { SourceRef } from "@/components/SourceCitations";

interface TrustSafetyPanelProps {
  sources: SourceRef[];
  answer: string;
}

const TrustSafetyPanel = ({ sources, answer }: TrustSafetyPanelProps) => {
  const [open, setOpen] = useState(false);

  // Score logic based on sources
  const sourceCount = sources.length;
  const hasGovSources = sources.some(s => /\.gov|\.edu|\.org|nasa|who\.int/i.test(s.domain || s.url));
  const hasNewsSources = sources.some(s => /bbc|cnn|reuters|aljazeera|guardian|nytimes/i.test(s.domain || s.url));
  const hasUnverified = sources.some(s => /blog|medium|reddit|quora|forum/i.test(s.domain || s.url));

  const reliability = hasGovSources ? 92 : hasNewsSources ? 82 : sourceCount >= 3 ? 74 : sourceCount >= 1 ? 60 : 45;
  const riskLevel = reliability >= 85 ? "Low" : reliability >= 65 ? "Medium" : "High";
  const trustLevel = reliability >= 85 ? "High" : reliability >= 65 ? "Medium-High" : "Medium";

  const riskColor = riskLevel === "Low" ? "text-[hsl(142,70%,50%)]" : riskLevel === "Medium" ? "text-yellow-400" : "text-red-400";
  const trustColor = reliability >= 80 ? "text-[hsl(142,70%,50%)]" : reliability >= 65 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Trust & Safety Analysis</span>
        <span className={`ml-auto text-[10px] font-semibold ${trustColor}`}>
          Reliability: {reliability}%
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-4 rounded-xl bg-secondary/20 border border-border/20 space-y-3 overflow-hidden"
        >
          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <div className={`text-xl font-bold ${trustColor}`}>{reliability}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">Reliability Score</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <div className={`text-sm font-bold ${trustColor}`}>{trustLevel}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Trust Level</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/30">
              <div className={`text-sm font-bold ${riskColor}`}>{riskLevel}</div>
              <div className="text-[10px] text-muted-foreground mt-1">Risk Level</div>
            </div>
          </div>

          {/* Source Credibility */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Info className="w-3 h-3 text-primary" /> Source Credibility Breakdown
            </h4>
            {hasGovSources && (
              <div className="flex items-center gap-2 text-xs text-[hsl(142,70%,50%)]">
                <CheckCircle className="w-3 h-3" />
                <span>High Trust: Government / Verified Data sources detected</span>
              </div>
            )}
            {hasNewsSources && (
              <div className="flex items-center gap-2 text-xs text-[hsl(142,70%,50%)]">
                <CheckCircle className="w-3 h-3" />
                <span>High Trust: Major news outlets referenced</span>
              </div>
            )}
            {sourceCount > 0 && !hasGovSources && !hasNewsSources && (
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Medium Trust: Web sources — no government/academic verification</span>
              </div>
            )}
            {hasUnverified && (
              <div className="flex items-center gap-2 text-xs text-yellow-400">
                <AlertTriangle className="w-3 h-3" />
                <span>Low Trust: Unverified sources (blogs/forums) detected</span>
              </div>
            )}
            {sourceCount === 0 && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span>No external sources — AI-generated reasoning only</span>
              </div>
            )}
          </div>

          <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
            🕒 Analysis generated at {new Date().toLocaleTimeString()} • {sourceCount} source(s) evaluated
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TrustSafetyPanel;

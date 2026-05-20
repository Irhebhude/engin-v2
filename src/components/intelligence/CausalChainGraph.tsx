import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, ChevronDown, ChevronUp } from "lucide-react";
import { deriveCausalChain } from "@/lib/intelligence-derive";

interface Props { query: string; answer: string; }

const COL_X = { cause: 60, mechanism: 320, effect: 580 };
const ROW_H = 90;

const CausalChainGraph = ({ query, answer }: Props) => {
  const [open, setOpen] = useState(false);
  const { nodes, edges } = useMemo(() => deriveCausalChain(query, answer), [query, answer]);

  // Position nodes per type column
  const rowsByType: Record<string, number> = { cause: 0, mechanism: 0, effect: 0 };
  const positioned = nodes.map((n) => {
    const row = rowsByType[n.type]++;
    return { ...n, x: COL_X[n.type], y: 40 + row * ROW_H };
  });
  const nodeMap = new Map(positioned.map((n) => [n.id, n]));
  const height = Math.max(...positioned.map((n) => n.y)) + 60;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors text-xs text-muted-foreground"
      >
        <GitBranch className="w-3.5 h-3.5 text-primary" />
        <span className="font-medium">Causal Chain Graph</span>
        <span className="ml-auto text-[10px] text-primary font-semibold">
          {nodes.length} nodes · {edges.length} links
        </span>
        {open ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
      </button>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="mt-2 p-3 rounded-xl bg-secondary/20 border border-border/20 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <svg width={740} height={height} className="block">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 Z" fill="hsl(var(--primary))" />
                </marker>
              </defs>
              {edges.map((e, i) => {
                const a = nodeMap.get(e.from);
                const b = nodeMap.get(e.to);
                if (!a || !b) return null;
                const x1 = a.x + 130;
                const y1 = a.y + 20;
                const x2 = b.x - 4;
                const y2 = b.y + 20;
                const cx = (x1 + x2) / 2;
                return (
                  <path
                    key={i}
                    d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                    stroke="hsl(var(--primary) / 0.5)"
                    strokeWidth={1.5}
                    fill="none"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
              {positioned.map((n) => (
                <g key={n.id}>
                  <rect
                    x={n.x}
                    y={n.y}
                    width={130}
                    height={42}
                    rx={8}
                    fill={n.type === "cause" ? "hsl(var(--primary) / 0.18)" : n.type === "effect" ? "hsl(142,70%,50% / 0.15)" : "hsl(var(--secondary) / 0.4)"}
                    stroke={n.type === "cause" ? "hsl(var(--primary))" : n.type === "effect" ? "hsl(142,70%,50%)" : "hsl(var(--border))"}
                    strokeWidth={1}
                  />
                  <text x={n.x + 8} y={n.y + 14} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="start">
                    {n.type.toUpperCase()}
                  </text>
                  <foreignObject x={n.x + 6} y={n.y + 16} width={120} height={24}>
                    <div style={{ fontSize: 10, color: "hsl(var(--foreground))", lineHeight: 1.2, overflow: "hidden" }}>
                      {n.label}
                    </div>
                  </foreignObject>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CausalChainGraph;

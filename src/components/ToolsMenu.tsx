import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  Brain,
  Code,
  GraduationCap,
  TrendingUp,
  Globe,
  FileText,
  Shield,
  Sparkles,
  Image,
  Cpu,
  Video,
  Newspaper,
  ScrollText,
  Hammer,
  MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { SearchMode } from "@/lib/search-api";

interface Tool {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  mode?: SearchMode;
  action?: string;
}

const TOOLS: { category: string; items: Tool[] }[] = [
  {
    category: "Search Modes",
    items: [
      { id: "ai", label: "AI Smart Search", description: "Intent-aware intelligent answers", icon: Sparkles, mode: "default" },
      { id: "deep", label: "Deep Research", description: "Multi-source academic analysis", icon: Brain, mode: "deep_research" },
      { id: "code", label: "Code Intelligence", description: "Developer-focused search", icon: Code, mode: "code" },
      { id: "academic", label: "Academic Search", description: "Scientific & research papers", icon: GraduationCap, mode: "academic" },
      { id: "business", label: "Business & Finance", description: "Market & financial analysis", icon: TrendingUp, mode: "business" },
    ],
  },
  {
    category: "Media Search",
    items: [
      { id: "images", label: "Image Search", description: "Real-time web image discovery", icon: Image, action: "images" },
      { id: "videos", label: "Video Search", description: "Live video search & preview", icon: Video, action: "videos" },
      { id: "news", label: "News Search", description: "Real-time news aggregation", icon: Newspaper, action: "news" },
    ],
  },
  {
    category: "Intelligence Tools",
    items: [
      { id: "blueprint", label: "Blueprint Generator", description: "AI technical schematics & build guides", icon: Cpu, action: "blueprint" },
      { id: "buildguide", label: "Build Guide Video", description: "AI step-by-step video build instructions", icon: Hammer, action: "buildguide" },
      { id: "summarize", label: "Website Summarizer", description: "AI-powered page understanding", icon: FileText, action: "summarize" },
      { id: "location", label: "Location Search", description: "OpenStreetMap-powered place finder", icon: MapPin, action: "location" },
      { id: "poi", label: "POI Discovery Engine", description: "Trust-verified place intelligence", icon: Brain, action: "poi" },
      { id: "web", label: "Live Web Results", description: "Real-time internet search", icon: Globe, action: "web" },
      { id: "trust", label: "Trust & Safety", description: "Source credibility analysis", icon: Shield, action: "trust" },
    ],
  },
  {
    category: "Governance",
    items: [
      { id: "policies", label: "Policies & Governance", description: "Responsible AI framework", icon: ScrollText, action: "policies" },
    ],
  },
];

interface ToolsMenuProps {
  onSelectMode: (mode: SearchMode) => void;
  onAction: (action: string) => void;
}

const ToolsMenu = ({ onSelectMode, onAction }: ToolsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass hover:bg-accent/20 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        Tools
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close menu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 glass rounded-xl overflow-hidden z-50 glow-box max-h-[70vh] overflow-y-auto"
            >
              {TOOLS.map((category) => (
                <div key={category.category}>
                  <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground border-b border-border/30">
                    {category.category}
                  </div>
                  {category.items.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          if (tool.action === "policies") {
                            navigate("/policies");
                          } else {
                            if (tool.mode) onSelectMode(tool.mode);
                            if (tool.action) onAction(tool.action);
                          }
                          setIsOpen(false);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                      >
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{tool.label}</div>
                          <div className="text-[11px] text-muted-foreground">{tool.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="px-4 py-2 text-[10px] text-muted-foreground border-t border-border/30">
                SEARCH-POI • POI Foundation
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ToolsMenu;

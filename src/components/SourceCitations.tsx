import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, Shield } from "lucide-react";

export interface SourceRef {
  url: string;
  title: string;
  domain: string;
}

interface SourceCitationsProps {
  sources: SourceRef[];
}

const SourceCitations = forwardRef<HTMLDivElement, SourceCitationsProps>(({ sources }, ref) => {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div ref={ref} className="mt-4 border-t border-border/30 pt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-medium text-primary/80 hover:text-primary transition-colors w-full"
      >
        <Shield className="w-3.5 h-3.5" />
        <span>Verified Sources ({sources.length})</span>
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {sources.map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group text-xs"
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=16`}
                    alt="" className="w-3.5 h-3.5 rounded-sm"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-muted-foreground truncate flex-1">{src.title || src.domain}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

SourceCitations.displayName = "SourceCitations";

export default SourceCitations;

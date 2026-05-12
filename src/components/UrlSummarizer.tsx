import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Loader2, Link } from "lucide-react";
import { summarizeUrl } from "@/lib/search-api";

interface UrlSummarizerProps {
  isOpen: boolean;
  onClose: () => void;
}

const UrlSummarizer = ({ isOpen, onClose }: UrlSummarizerProps) => {
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSummarize = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError("");
    setSummary("");
    try {
      const result = await summarizeUrl(url.trim());
      setSummary(result);
    } catch (e: any) {
      setError(e.message || "Failed to summarize");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto glow-box"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Website Understanding Engine</h3>
                <p className="text-xs text-muted-foreground">AI-powered instant page analysis</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 glass rounded-xl px-4 py-3">
              <Link className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSummarize()}
                placeholder="Paste any URL to understand it instantly..."
                className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            <button
              onClick={handleSummarize}
              disabled={!url.trim() || isLoading}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
            </button>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">{error}</div>
          )}

          {summary && (
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="text-secondary-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UrlSummarizer;

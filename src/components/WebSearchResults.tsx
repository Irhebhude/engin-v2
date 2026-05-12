import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, ExternalLink, FileText, Loader2 } from "lucide-react";
import { summarizeUrl } from "@/lib/search-api";
import BusinessBadge from "@/components/BusinessBadge";
import ActionButtons from "@/components/ActionButtons";

export interface WebResult {
  url: string;
  title: string;
  description: string;
  markdown?: string;
  // Business enrichment (optional)
  isVerified?: boolean;
  phone?: string;
  whatsapp?: string;
  memberDiscount?: number;
  businessName?: string;
}

const getDomain = (url: string) => {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
};

const getBreadcrumb = (url: string) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return u.hostname.replace("www.", "");
    return `${u.hostname.replace("www.", "")} › ${parts.slice(0, 2).join(" › ")}`;
  } catch { return url; }
};

interface WebSearchResultsProps {
  results: WebResult[];
  isLoading: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  isPremiumUser?: boolean;
  liteMode?: boolean;
  query?: string;
}

const WebSearchResults = ({ results, isLoading, onLoadMore, isLoadingMore, hasMore = true, isPremiumUser, liteMode, query }: WebSearchResultsProps) => {
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  const handleSummarize = async (url: string) => {
    if (summaries[url]) {
      setSummaries((prev) => { const n = { ...prev }; delete n[url]; return n; });
      return;
    }
    setSummarizing(url);
    try {
      const summary = await summarizeUrl(url);
      setSummaries((prev) => ({ ...prev, [url]: summary }));
    } catch {
      setSummaries((prev) => ({ ...prev, [url]: "Failed to summarize this page." }));
    } finally {
      setSummarizing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-3 bg-muted/30 rounded w-48" />
            <div className="h-5 bg-muted/20 rounded w-3/4" />
            <div className="h-4 bg-muted/10 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  // Lite mode: text-only minimal layout
  if (liteMode) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Web Results</p>
        {results.map((result, i) => (
          <div key={i} className="border-b border-border/20 pb-2">
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">
              {result.title || getDomain(result.url)}
            </a>
            <p className="text-xs text-muted-foreground">{getDomain(result.url)}</p>
            {result.description && <p className="text-xs text-foreground/70 mt-0.5">{result.description}</p>}
            {result.isVerified && <BusinessBadge isVerified memberDiscount={result.memberDiscount} isPremiumUser={isPremiumUser} />}
            {(result.phone || result.whatsapp) && (
              <ActionButtons phone={result.phone} whatsapp={result.whatsapp} businessName={result.businessName} query={query} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-1">
      <div className="flex items-center gap-2 mb-4">
        <Globe className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Web Results</h2>
      </div>

      {results.map((result, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="px-4 py-4 -mx-4 rounded-xl hover:bg-accent/10 transition-colors"
        >
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="group block">
            <div className="flex items-center gap-2 mb-1">
              <img
                src={`https://www.google.com/s2/favicons?domain=${getDomain(result.url)}&sz=32`}
                alt="" className="w-4 h-4 rounded-sm"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-xs text-muted-foreground truncate">{getBreadcrumb(result.url)}</span>
              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
            </div>
            <h3 className="text-lg font-medium text-primary group-hover:underline underline-offset-2 leading-snug">
              {result.title || getDomain(result.url)}
            </h3>
            {result.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{result.description}</p>
            )}
          </a>

          {/* Business badges */}
          {result.isVerified && (
            <div className="mt-2">
              <BusinessBadge isVerified memberDiscount={result.memberDiscount} isPremiumUser={isPremiumUser} />
            </div>
          )}

          {/* Action buttons for businesses */}
          {(result.phone || result.whatsapp) && (
            <ActionButtons phone={result.phone} whatsapp={result.whatsapp} businessName={result.businessName} query={query} />
          )}

          {/* AI Summarize button */}
          <button
            onClick={() => handleSummarize(result.url)}
            className="flex items-center gap-1.5 mt-2 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {summarizing === result.url ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <FileText className="w-3 h-3" />
            )}
            {summaries[result.url] ? "Hide Summary" : "AI Summary"}
          </button>

          {summaries[result.url] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-sm text-secondary-foreground whitespace-pre-wrap leading-relaxed"
            >
              {summaries[result.url]}
            </motion.div>
          )}
        </motion.div>
      ))}

      {/* See more results button */}
      {results.length >= 5 && hasMore && onLoadMore && (
        <div className="flex justify-center mt-8 mb-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="flex items-center gap-2 px-8 py-3 rounded-full border border-border/50 bg-accent/5 hover:bg-accent/15 text-sm font-medium text-foreground transition-all hover:shadow-md disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading more results…
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-primary" />
                See more results
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default WebSearchResults;

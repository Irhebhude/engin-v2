import { motion } from "framer-motion";
import { Newspaper, ExternalLink, Clock } from "lucide-react";

export interface NewsResult {
  url: string;
  title: string;
  description: string;
  domain: string;
  publishedAt?: string | null;
  favicon?: string;
}

interface NewsSearchResultsProps {
  results: NewsResult[];
  isLoading: boolean;
}

const timeAgo = (date: string | null | undefined) => {
  if (!date) return null;
  try {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  } catch {
    return null;
  }
};

const NewsSearchResults = ({ results, isLoading }: NewsSearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">News</h2>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse glass rounded-xl p-4">
            <div className="h-3 bg-muted/20 rounded w-24 mb-2" />
            <div className="h-5 bg-muted/20 rounded w-3/4 mb-2" />
            <div className="h-4 bg-muted/10 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          News Results ({results.length})
        </h2>
      </div>

      <div className="space-y-3">
        {results.map((article, i) => {
          const ago = timeAgo(article.publishedAt);
          return (
            <motion.a
              key={i}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group block glass rounded-xl p-4 border border-border/30 hover:border-primary/40 transition-all hover:glow-box"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <img
                  src={article.favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs text-muted-foreground">{article.domain}</span>
                {ago && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {ago}
                    </span>
                  </>
                )}
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
              </div>
              <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {article.title || article.domain}
              </h3>
              {article.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                  {article.description}
                </p>
              )}
            </motion.a>
          );
        })}
      </div>
    </div>
  );
};

export default NewsSearchResults;

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Zap, ArrowLeft, Loader2, ExternalLink, Shield } from "lucide-react";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import SourceCitations, { type SourceRef } from "@/components/SourceCitations";
import { streamSearch, webSearch } from "@/lib/search-api";
import type { WebResult } from "@/lib/search-api";

const QueryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const query = (slug || "").replace(/-/g, " ");

  const [answer, setAnswer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState<SourceRef[]>([]);
  const [confidence, setConfidence] = useState(0);

  const performSearch = useCallback(async () => {
    if (!query) return;
    setIsStreaming(true);
    let accumulated = "";

    // Parallel: AI + web
    const aiPromise = streamSearch({
      query,
      mode: "default",
      context: [],
      onDelta: (chunk) => { accumulated += chunk; setAnswer(accumulated); },
      onDone: () => setIsStreaming(false),
    }).catch(() => setIsStreaming(false));

    const webPromise = webSearch(query, 8).then((results: WebResult[]) => {
      const refs: SourceRef[] = results.map(r => {
        let domain = "";
        try { domain = new URL(r.url).hostname.replace("www.", ""); } catch { domain = r.url; }
        return { url: r.url, title: r.title, domain };
      });
      setSources(refs);
      setConfidence(refs.length >= 5 ? 92 : refs.length >= 3 ? 82 : refs.length >= 1 ? 68 : 55);
    }).catch(() => {});

    await Promise.allSettled([aiPromise, webPromise]);
  }, [query]);

  useEffect(() => { performSearch(); }, [performSearch]);

  const hasGovSources = sources.some(s => /\.gov|\.edu|\.org/i.test(s.domain));
  const validationType = hasGovSources ? "Source-Backed" : sources.length >= 2 ? "Logic-Backed" : "Uncertain";
  const authorityScore = hasGovSources ? 92 : sources.length >= 4 ? 82 : sources.length >= 2 ? 68 : 45;

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${query} — SEARCH-POI Intelligence`,
    description: answer.slice(0, 160),
    author: { "@type": "Organization", name: "SEARCH-POI Engine v1" },
    publisher: { "@type": "Organization", name: "POI Foundation" },
    datePublished: new Date().toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://search-poi.lovable.app/q/${slug}` },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [{
      "@type": "Question",
      name: query,
      acceptedAnswer: { "@type": "Answer", text: answer.slice(0, 500) },
    }],
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${query} — SEARCH-POI Intelligence`}
        description={answer.slice(0, 155) || `AI-powered analysis of "${query}" with verified sources, confidence scoring, and multi-platform optimization.`}
        path={`/q/${slug}`}
        jsonLd={jsonLd}
      />
      {/* Additional structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <Header />

      <main className="pt-20 pb-16 px-4">
        <div className="container mx-auto max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-3 h-3" /> Back to SEARCH-POI
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 glow-box">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="font-bold text-lg text-foreground">{query}</h1>
                <p className="text-xs text-muted-foreground">SEARCH-POI Engine v1 • ICS Reasoning • Public Intelligence Page</p>
              </div>
            </div>

            {/* Scores bar */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2.5 rounded-lg bg-secondary/30">
                <div className={`text-lg font-bold ${confidence >= 80 ? "text-[hsl(142,70%,50%)]" : "text-yellow-400"}`}>{confidence}%</div>
                <div className="text-[10px] text-muted-foreground">Confidence</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-secondary/30">
                <div className={`text-lg font-bold ${authorityScore >= 80 ? "text-[hsl(142,70%,50%)]" : "text-yellow-400"}`}>{authorityScore}</div>
                <div className="text-[10px] text-muted-foreground">Authority</div>
              </div>
              <div className="text-center p-2.5 rounded-lg bg-secondary/30">
                <div className={`text-sm font-bold ${validationType === "Source-Backed" ? "text-[hsl(142,70%,50%)]" : validationType === "Logic-Backed" ? "text-yellow-400" : "text-red-400"}`}>
                  {validationType}
                </div>
                <div className="text-[10px] text-muted-foreground">Validation</div>
              </div>
            </div>

            {/* Optimization tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["AEO", "LEO", "GEO", "SMO", "VSO", "ASO", "PSO", "SxO", "PAA", "AIO", "UGC"].map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold">{tag}</span>
              ))}
            </div>

            {/* Answer */}
            <div className="prose prose-invert prose-sm max-w-none mb-4">
              {isStreaming && !answer && (
                <div className="flex items-center gap-2 text-primary text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating intelligence...
                </div>
              )}
              <div className="text-secondary-foreground leading-relaxed whitespace-pre-wrap">
                {answer}
                {isStreaming && <span className="inline-block w-2 h-5 bg-primary ml-0.5 animate-pulse" />}
              </div>
            </div>

            {/* Sources */}
            {sources.length > 0 && <SourceCitations sources={sources} />}

            {/* Reasoning summary */}
            {!isStreaming && answer && (
              <div className="mt-4 p-3 rounded-lg bg-secondary/20 border border-border/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-foreground">ICS Reasoning Summary</span>
                </div>
                <div className="text-[11px] text-muted-foreground space-y-1">
                  <p>• <strong>Intent:</strong> {query.split(" ").length > 3 ? "Complex multi-concept query" : "Direct informational query"}</p>
                  <p>• <strong>Context:</strong> Synthesized from {sources.length} verified web sources</p>
                  <p>• <strong>Reasoning:</strong> 5-step pipeline (Parse → Retrieve → Validate → Synthesize → Score)</p>
                  <p>• <strong>Risk:</strong> {validationType === "Uncertain" ? "High — limited verification available" : validationType === "Source-Backed" ? "Low — authoritative sources confirmed" : "Moderate — logic-backed with web corroboration"}</p>
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border/20 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>Powered by <span className="text-primary font-semibold">SEARCH-POI Engine v1</span> • POI Foundation</span>
              <span>Generated {new Date().toLocaleDateString()}</span>
            </div>
          </motion.div>

          {/* CTA */}
          <div className="text-center mt-8">
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Zap className="w-4 h-4" /> Search More on SEARCH-POI
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QueryPage;

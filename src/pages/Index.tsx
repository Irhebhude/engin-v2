import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Brain, Zap, Globe, Shield, Cpu, Layers, MapPin, Crown, Building2, TrendingUp, BarChart3, LineChart, ArrowRight } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import IndependenceBadge from "@/components/IndependenceBadge";
import AdSense from "@/components/AdSense";
import SEOHead from "@/components/SEOHead";
import LiveActivityFeed from "@/components/LiveActivityFeed";
import TrendingTopics from "@/components/TrendingTopics";
import LocationSearch from "@/components/LocationSearch";
import FintechDashboard from "@/components/FintechDashboard";

const QUICK_PILLS = [
  { label: "Lagos businesses", q: "Top verified businesses in Lagos" },
  { label: "Fuel price today", q: "Current fuel price in Nigeria today" },
  { label: "FX rate USD/NGN", q: "USD to NGN exchange rate today" },
  { label: "Startup ideas 2026", q: "Best startup ideas in Nigeria 2026" },
];

const BENTO = [
  { icon: Brain, title: "Reasoning AI", desc: "Multi-step logic, not just keywords." },
  { icon: Zap, title: "Real-Time", desc: "Live data, fresh answers." },
  { icon: Globe, title: "Deep Web", desc: "Semantic crawl, billions of pages." },
  { icon: Shield, title: "Privacy First", desc: "No tracking, no profiling." },
  { icon: Cpu, title: "Multi-Model", desc: "Gemini + GPT-5 in parallel." },
  { icon: Layers, title: "Research Mode", desc: "Academic-quality reports." },
  { icon: TrendingUp, title: "Fintech Pulse", desc: "Live FX, crypto, commodities." },
  { icon: BarChart3, title: "Business Insights", desc: "Custom analytics dashboards." },
  { icon: LineChart, title: "Market Edge", desc: "Trend prediction, intel reports." },
];

const FINTECH_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SEARCH-POI",
  url: "https://search-poi.lovable.app/",
  description: "AI-powered intelligence ecosystem for search, fintech analytics, market analysis, and business verification.",
  applicationCategory: "SearchApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
  creator: { "@type": "Organization", name: "POI Foundation" },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: "https://search-poi.lovable.app/search?q={search_term_string}" },
    "query-input": "required name=search_term_string",
  },
};

const Index = () => {
  const navigate = useNavigate();
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  const handleSearch = (q: string) => navigate(`/search?q=${encodeURIComponent(q)}`);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden aurora-bg">
      <SEOHead
        title="SEARCH-POI — AI Search Engine & Fintech Intelligence"
        description="Next-gen AI search with real-time market analytics, fintech intelligence, business verification & deep research."
        path="/"
        keywords={["AI search engine", "fintech intelligence", "SEARCH-POI", "POI Foundation", "alternative to Google"]}
        jsonLd={FINTECH_JSON_LD}
      />
      <Header />

      {/* HERO — hyper-minimalist, centered, search-centric */}
      <section className="workspace-shell px-4">
        {/* Wordmark logo */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 mb-8 sm:mb-10"
        >
          <IndependenceBadge />
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden ring-1 ring-primary/30 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.45)]">
            <img src="/search-poi-logo.jpg" alt="SEARCH-POI" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-mega text-center">
            <span className="text-foreground">SEARCH</span>
            <span className="gradient-text">-POI</span>
          </h1>
          <p className="text-hero-sub text-muted-foreground text-center max-w-xl">
            Don't search. <span className="text-foreground">Ask.</span> The reasoning engine for African intelligence.
          </p>
        </motion.div>

        {/* Mega search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="w-full max-w-3xl"
        >
          <div className="search-mega px-2 py-1.5 sm:px-3 sm:py-2">
            <SearchBar onSearch={handleSearch} compact />
          </div>

          {/* Quick pills — Google 2026 style suggestion chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {QUICK_PILLS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSearch(p.q)}
                className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm text-muted-foreground hover:text-foreground bg-card/40 hover:bg-card/70 border border-border/40 hover:border-primary/40 backdrop-blur-xl transition-all"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setShowLocationSearch(true)}
              className="px-3.5 py-1.5 rounded-full text-xs sm:text-sm text-primary bg-primary/10 border border-primary/30 hover:bg-primary/20 backdrop-blur-xl transition-all flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              Near me
            </button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6 tracking-wide uppercase">
            SEARCH-POI Engine v1 · Multi-Step Reasoning
          </p>
        </motion.div>
      </section>

      {/* BENTO WORKSPACE — below the fold */}
      <section className="px-4 sm:px-6 mt-20 sm:mt-32 pb-20 max-w-7xl mx-auto">
        {/* Live widgets bento row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bento-grid mb-5"
        >
          <div className="bento-col-6 bento-card !p-0">
            <TrendingTopics />
          </div>
          <div className="bento-col-6 bento-card !p-0">
            <LiveActivityFeed />
          </div>
        </motion.div>

        {/* Fintech bento card — full width hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bento-grid mb-5"
        >
          <div className="bento-col-12 bento-card !p-0">
            <FintechDashboard />
          </div>
        </motion.div>

        {/* Capabilities bento — 9-tile grid like Google Workspace 2026 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-display text-foreground mb-6 text-center sm:text-left">
            One workspace. <span className="gradient-text">Every answer.</span>
          </h2>
          <div className="bento-grid">
            {BENTO.map((b, i) => {
              const Icon = b.icon;
              const span = i === 0 ? "bento-col-6" : i === 6 ? "bento-col-6" : "bento-col-4";
              return (
                <div key={b.title} className={`${span} bento-card group`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1 tracking-tight">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-3 mt-12 justify-center"
        >
          <Link
            to="/premium"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity min-h-[48px] shadow-[0_15px_40px_-15px_hsl(var(--primary)/0.6)]"
          >
            <Crown className="w-4 h-4" />
            Go Premium — ₦1,000/mo
          </Link>
          <Link
            to="/business"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/40 text-foreground font-semibold hover:border-primary/40 transition-colors min-h-[48px]"
          >
            <Building2 className="w-4 h-4" />
            Business Dashboard
          </Link>
        </motion.div>

        <AdSense adSlot="9944378861" adFormat="horizontal" className="mt-12" />
      </section>

      <Footer />
      <LocationSearch isOpen={showLocationSearch} onClose={() => setShowLocationSearch(false)} />
    </div>
  );
};

export default Index;

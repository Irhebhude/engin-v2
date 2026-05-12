import { motion } from "framer-motion";
import { Brain, Target, Eye, Zap, Shield, Gauge, Users, Sparkles, Search, Bot, Lock, Cpu, Globe } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import AdSense from "@/components/AdSense";

const CORE_VALUES = [
  { icon: Sparkles, label: "Innovation" },
  { icon: Brain, label: "Intelligence" },
  { icon: Shield, label: "Independence" },
  { icon: Zap, label: "Speed" },
  { icon: Target, label: "Accuracy" },
  { icon: Users, label: "User empowerment" },
];

const OWNERSHIP = [
  { icon: Cpu, label: "Crawler & Index", desc: "Our own Postgres FTS index, growing daily." },
  { icon: Brain, label: "Reasoning Engine", desc: "Multi-step ranking & trust scoring built in-house." },
  { icon: Globe, label: "Data Pipelines", desc: "Direct ingestion from public African sources." },
  { icon: Lock, label: "Privacy Stack", desc: "No tracking profiles. No behavioral targeting." },
];

const BUILT_TO = [
  { icon: Zap, text: "Deliver faster results" },
  { icon: Brain, text: "Provide smarter answers" },
  { icon: Gauge, text: "Show accurate real-time data" },
  { icon: Search, text: "Integrate image, video, news, and deep web search" },
  { icon: Bot, text: "Offer powerful AI tools" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const About = () => (
  <div className="min-h-screen bg-background">
    <SEOHead
      title="About POI Foundation — Owners of SEARCH-POI Engine v1"
      description="SEARCH-POI is built and owned by POI Foundation — an independent AI intelligence engine. Not Google. Not Microsoft. African-first."
      path="/about"
    />
    <Header />
    <main className="pt-20 pb-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-medium text-primary mb-5">
            <Shield className="w-3 h-3" />
            Independent · Owned by POI Foundation
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Built and owned by <span className="gradient-text">POI Foundation</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Not Google. Not Microsoft. Not OpenAI. SEARCH-POI is an independent intelligence engine, designed in Africa, owned by POI Foundation, and built for the next billion users.
          </p>
          <div className="h-1 w-16 mx-auto rounded-full bg-primary/60 mt-6" />
        </motion.div>

        {/* Independence manifesto */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-6 sm:p-8 mb-10 border border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Our Independence Manifesto
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-3">
            <span className="text-foreground font-semibold">SEARCH-POI</span> is not a wrapper around someone else's search. POI Foundation owns the index, the crawler, the ranking logic, and the user experience. Generative answers come from multiple LLMs through an open gateway — but the *retrieval*, the *trust scoring*, and the *African business intelligence* are ours.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            We're transparent about what's third-party (sign-in, ads, language models) and uncompromising about what isn't (the search engine itself).
          </p>
        </motion.section>

        {/* What we own */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-10">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">What POI Foundation owns</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {OWNERSHIP.map((o, i) => (
              <motion.div key={o.label} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="glass rounded-xl p-5 border border-border/30">
                <div className="flex items-center gap-2 mb-2">
                  <o.icon className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{o.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{o.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Built to */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="mb-10">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">SEARCH-POI is built to</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {BUILT_TO.map((d, i) => (
              <motion.div key={d.text} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="glass rounded-xl p-4 flex items-start gap-3 border border-border/30">
                <d.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{d.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Vision */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 border border-border/30 mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Our Vision</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            To become the most intelligent, trusted, and independent search platform on Earth — owned by a foundation, not a corporation.
          </p>
        </motion.div>

        {/* Core Values */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mb-10">
          <h2 className="text-2xl font-bold text-foreground text-center mb-6">Our Core Values</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {CORE_VALUES.map((v, i) => (
              <motion.div key={v.label} custom={i} initial="hidden" animate="visible" variants={fadeUp} className="glass rounded-xl px-4 py-3 flex items-center gap-2 border border-border/30">
                <v.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{v.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <AdSense adSlot="9944378861" adFormat="auto" className="mb-10" />

        {/* Founder */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass rounded-2xl p-6 sm:p-8 border border-primary/20 text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-1">Prosper Ozoya Irhebhude</h3>
          <p className="text-primary font-medium text-sm mb-3">Founder, POI Foundation</p>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            SEARCH-POI Engine v1 was founded and is owned by Prosper Ozoya Irhebhude under POI Foundation — an independent organization with no corporate parent.
          </p>
        </motion.section>

        <div className="text-center text-xs text-muted-foreground">
          <p>SEARCH-POI Engine v1 · An independent product of <span className="text-primary font-semibold">POI Foundation</span></p>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default About;

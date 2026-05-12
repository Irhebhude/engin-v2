import { motion } from "framer-motion";
import { Shield, Brain, Lock, Eye, Scale, Globe } from "lucide-react";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import AdSense from "@/components/AdSense";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const POLICIES = [
  {
    id: "ai-usage",
    icon: Brain,
    title: "Advanced Intelligence Usage Policy",
    sections: [
      {
        heading: "AI Reasoning Transparency",
        content:
          "SEARCH-POI's AI models provide full transparency into how answers are generated. Every AI-powered result includes source attribution, confidence indicators, and reasoning chains so users understand why an answer was produced.",
      },
      {
        heading: "Responsible AI Usage",
        content:
          "Our AI systems are designed to be helpful, accurate, and unbiased. We continuously audit model outputs for harmful content, misinformation, and bias. Users can flag inaccurate results for immediate review.",
      },
      {
        heading: "Fair Ranking Principles",
        content:
          "Search results are ranked by relevance, accuracy, and source credibility — never by commercial influence. SEARCH-POI does not accept payment for higher placement in organic results.",
      },
      {
        heading: "Data Accuracy Protection",
        content:
          "Our Multi-Source Intelligence Engine cross-references information across multiple independent sources before presenting answers. Contradictory or unverified claims are clearly labeled.",
      },
    ],
  },
  {
    id: "tool-access",
    icon: Lock,
    title: "Advanced Tool Access Policy",
    sections: [
      {
        heading: "Secure Access to Intelligence Tools",
        content:
          "All SEARCH-POI intelligence tools — including Deep Research Mode, Code Intelligence, and Business Analysis — are accessible through authenticated, rate-limited endpoints to prevent abuse while remaining freely available.",
      },
      {
        heading: "API Usage Protection",
        content:
          "API consumers are subject to fair-use limits designed to ensure equitable access. Automated scraping, result manipulation, and unauthorized redistribution of AI-generated content are prohibited.",
      },
      {
        heading: "Anti-Abuse Monitoring",
        content:
          "Real-time monitoring detects and mitigates prompt injection, adversarial queries, and automated attacks against SEARCH-POI's intelligence systems without compromising legitimate user privacy.",
      },
    ],
  },
  {
    id: "live-data",
    icon: Eye,
    title: "Live Data Processing Policy",
    sections: [
      {
        heading: "Ethical Real-Time Data Handling",
        content:
          "SEARCH-POI's Real-Time Intelligence Layer processes live data streams — news, markets, trends — with strict ethical guidelines. Sensitive events receive careful editorial consideration before surfacing in results.",
      },
      {
        heading: "Privacy-First Intelligence Processing",
        content:
          "No personal data is stored, profiled, or sold. Search queries are processed in-memory and discarded after the session. Context Memory is stored locally on the user's device and never transmitted to our servers.",
      },
      {
        heading: "Zero Unauthorized Surveillance",
        content:
          "SEARCH-POI categorically rejects surveillance capitalism. We do not build user profiles, track browsing behavior, or share data with advertisers or government entities without valid legal process.",
      },
    ],
  },
];

const Policies = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Privacy & Policies — SEARCH-POI" description="Read SEARCH-POI's privacy policy, terms of service, and data governance. Your privacy is our priority." path="/policies" />
      <Header />

      <main className="relative z-10 pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs text-primary font-medium mb-4">
              <Scale className="w-3 h-3" />
              Governance & Compliance
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
              <span className="text-foreground">SEARCH-POI </span>
              <span className="gradient-text">Policies</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Transparent, ethical, secure, and globally compliant. Our policies
              govern every aspect of how SEARCH-POI handles intelligence,
              tools, and data.
            </p>
          </motion.div>

          <div className="space-y-6">
            {POLICIES.map((policy, i) => {
              const Icon = policy.icon;
              return (
                <motion.div
                  key={policy.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-border/30">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {policy.title}
                    </h2>
                  </div>

                  <Accordion type="multiple" className="px-6">
                    {policy.sections.map((section, j) => (
                      <AccordionItem
                        key={j}
                        value={`${policy.id}-${j}`}
                        className="border-border/20"
                      >
                        <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline">
                          {section.heading}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                          {section.content}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </motion.div>
              );
            })}
          </div>

          <AdSense adSlot="9944378861" adFormat="auto" className="mt-8" />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-16 space-y-2 text-xs text-muted-foreground"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass">
              <Globe className="w-3 h-3 text-primary" />
              Globally Compliant
            </div>
            <p>
              SEARCH-POI • Created & Owned by{" "}
              <span className="text-foreground font-medium">
                Prosper Ozoya Irhebhude
              </span>{" "}
              • POI Foundation
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Policies;

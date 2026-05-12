import { motion } from "framer-motion";
import { Check, Crown, Zap, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";

const PLANS = [
  {
    name: "Free",
    price: "₦0",
    period: "forever",
    icon: Zap,
    color: "text-muted-foreground",
    bg: "bg-secondary/30",
    border: "border-border/30",
    features: [
      "5 searches per day",
      "Basic AI answers",
      "Web, Image & Video search",
      "Community support",
    ],
    cta: "Get Started Free",
    ctaLink: "/auth",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₦1,000",
    period: "/month",
    icon: Crown,
    color: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/30",
    features: [
      "Unlimited searches",
      "Full Reasoning Engine access",
      "Build Guide & Blueprints",
      "Trust & Safety analysis",
      "Deep Research mode",
      "Knowledge Vault (5 vaults)",
      "Priority AI models",
      "Member discounts from merchants",
    ],
    cta: "Activate Pro",
    ctaLink: "/premium",
    highlight: true,
  },
  {
    name: "Business",
    price: "₦10,000",
    period: "/month",
    icon: Building2,
    color: "text-[hsl(45,90%,55%)]",
    bg: "bg-[hsl(45,90%,50%)]/5",
    border: "border-[hsl(45,90%,50%)]/30",
    features: [
      "Everything in Pro",
      "SEARCH-POI Intelligence API",
      "1,000 API calls/month",
      "Market Intelligence dashboard",
      "Business verification badge",
      "Dedicated support",
      "Custom analytics reports",
      "Team accounts (up to 5)",
    ],
    cta: "Contact Sales",
    ctaLink: "/contact",
    highlight: false,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing — SEARCH-POI AI Business Intelligence"
        description="Choose the right SEARCH-POI plan for your business. Free, Pro ₦1,000/mo, or Business ₦10,000/mo with API access and market intelligence."
        path="/pricing"
      />
      <Header />

      <main className="container mx-auto max-w-5xl px-4 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Simple, Transparent <span className="text-primary">Pricing</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            AI-powered business intelligence for every stage of growth.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border ${plan.border} ${plan.bg} p-6 flex flex-col ${
                  plan.highlight ? "ring-2 ring-primary/40 scale-[1.02]" : ""
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    MOST POPULAR
                  </div>
                )}
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className={`w-5 h-5 ${plan.color}`} />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to={plan.ctaLink}
                  className={`text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-12 text-xs text-muted-foreground">
          All plans include core AI search. Premium features unlock with Pro and Business tiers.
        </div>
      </main>
    </div>
  );
};

export default Pricing;

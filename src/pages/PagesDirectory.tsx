import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Home, Search, TrendingUp, Share2, Library, FileQuestion,
  Cpu, Radio, Trophy, Code, User, Shield, Gift, Star, Tag, Mail,
  Briefcase, Info, MessageSquare, ScrollText, Scale, ListChecks,
  LayoutDashboard, Megaphone,
} from "lucide-react";

const ADMIN_EMAIL = "prosperozoya50@gmail.com";

type Item = { to: string; label: string; desc: string; icon: any };
type Group = { title: string; items: Item[]; adminOnly?: boolean };

const GROUPS: Group[] = [
  {
    title: "Core",
    items: [
      { to: "/", label: "Home", desc: "Main search entry", icon: Home },
      { to: "/search", label: "Search Results", desc: "AI + web results", icon: Search },
      { to: "/insights", label: "Insights", desc: "SEO articles hub", icon: TrendingUp },
      { to: "/shared/demo", label: "Shared Search", desc: "Public permalinks", icon: Share2 },
      { to: "/vaults/demo", label: "Knowledge Vaults", desc: "Curated repositories", icon: Library },
      { to: "/q/demo", label: "Query Pages", desc: "SEO query landing", icon: FileQuestion },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { to: "/nexus", label: "Nexus Core", desc: "Omega intelligence system", icon: Cpu },
      { to: "/live-sources", label: "Live Sources", desc: "Real-time data feeds", icon: Radio },
      { to: "/points", label: "POI Points", desc: "Verification rewards", icon: Trophy },
      { to: "/developer", label: "Developer API", desc: "Keys, usage, playground", icon: Code },
    ],
  },
  {
    title: "Account & Security",
    items: [
      { to: "/auth", label: "Sign In / Up", desc: "Authentication", icon: User },
      { to: "/security", label: "Security & Passcode", desc: "Lock, PIN, biometric, recovery", icon: Shield },
      { to: "/referral", label: "Referral Program", desc: "Invite to unlock", icon: Gift },
      { to: "/premium", label: "Premium", desc: "Upgrade benefits", icon: Star },
      { to: "/pricing", label: "Pricing", desc: "Plan tiers", icon: Tag },
      { to: "/waitlist", label: "Waitlist", desc: "Early access signup", icon: Mail },
    ],
  },
  {
    title: "Business",
    items: [
      { to: "/business", label: "Business Dashboard", desc: "B2B merchant tools", icon: Briefcase },
    ],
  },
  {
    title: "Info & Governance",
    items: [
      { to: "/about", label: "About", desc: "Project background", icon: Info },
      { to: "/contact", label: "Contact", desc: "Reach the team", icon: Mail },
      { to: "/feedback", label: "Feedback", desc: "Report or suggest", icon: MessageSquare },
      { to: "/policies", label: "Policies", desc: "Data & governance", icon: ScrollText },
      { to: "/rights", label: "Rights", desc: "User rights", icon: Scale },
    ],
  },
  {
    title: "Admin",
    adminOnly: true,
    items: [
      { to: "/admin", label: "Admin Dashboard", desc: "Live stats & users", icon: LayoutDashboard },
      { to: "/admin/acquisition-control", label: "Acquisition Control", desc: "Social media poster", icon: Megaphone },
    ],
  },
];

export default function PagesDirectory() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-[#020810] text-cyan-100 px-4 py-8 md:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="font-['Orbitron'] text-3xl md:text-4xl text-[#00FFE7] tracking-widest mb-2">
            ◉ ALL PAGES
          </h1>
          <p className="font-['Space_Mono'] text-sm text-cyan-300/70">
            Complete directory of every page in SEARCH-POI Engine v2.
          </p>
        </header>

        {GROUPS.filter((g) => !g.adminOnly || isAdmin).map((group) => (
          <section key={group.title} className="mb-10">
            <h2 className="font-['Orbitron'] text-sm tracking-[0.3em] text-[#FF6B35] mb-4 border-b border-[#00FFE7]/20 pb-2">
              {group.title.toUpperCase()}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((it) => {
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    className="group block rounded-lg border border-[#00FFE7]/30 bg-[rgba(0,255,231,0.03)] backdrop-blur-sm p-4 min-h-[88px] hover:border-[#00FFE7] hover:bg-[rgba(0,255,231,0.08)] hover:shadow-[0_0_20px_rgba(0,255,231,0.25)] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-md border border-[#00FFE7]/40 bg-[#020810] p-2 text-[#00FFE7] group-hover:bg-[#00FFE7]/10">
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-['Orbitron'] text-sm text-[#00FFE7] truncate">
                          {it.label}
                        </div>
                        <div className="font-['Space_Mono'] text-[11px] text-cyan-300/60 truncate">
                          {it.to}
                        </div>
                        <div className="text-xs text-cyan-100/70 mt-1 line-clamp-2">
                          {it.desc}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

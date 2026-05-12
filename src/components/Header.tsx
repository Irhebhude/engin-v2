import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Clock, Menu, X, Gift, LogOut, User, Shield, Star, Trophy, Code, Trash2, Copy, Brain, GraduationCap, TrendingUp, Globe, FileText, Sparkles, Image as ImageIcon, Cpu, Video, Newspaper, ScrollText, Hammer, MapPin } from "lucide-react";
import SearchHistory from "@/components/SearchHistory";
import { clearSearchHistory } from "@/lib/search-context";
import { useToast } from "@/hooks/use-toast";
import LiteModeToggle from "@/components/LiteModeToggle";
import POIPointsBadge from "@/components/POIPointsBadge";
import { useAuth } from "@/contexts/AuthContext";

const ADMIN_EMAIL = "prosperozoya50@gmail.com";

const NAV_LINKS = [
  { to: "/about", label: "About" },
  { to: "/pricing", label: "Pricing" },
  { to: "/insights", label: "Insights" },
  { to: "/contact", label: "Contact" },
];

const TOOL_GROUPS: { category: string; items: { id: string; label: string; icon: any; to: string }[] }[] = [
  {
    category: "Search Modes",
    items: [
      { id: "ai", label: "AI Smart Search", icon: Sparkles, to: "/?mode=default" },
      { id: "deep", label: "Deep Research", icon: Brain, to: "/?mode=deep_research" },
      { id: "code", label: "Code Intelligence", icon: Code, to: "/?mode=code" },
      { id: "academic", label: "Academic Search", icon: GraduationCap, to: "/?mode=academic" },
      { id: "business", label: "Business & Finance", icon: TrendingUp, to: "/?mode=business" },
    ],
  },
  {
    category: "Media Search",
    items: [
      { id: "images", label: "Image Search", icon: ImageIcon, to: "/?action=images" },
      { id: "videos", label: "Video Search", icon: Video, to: "/?action=videos" },
      { id: "news", label: "News Search", icon: Newspaper, to: "/?action=news" },
    ],
  },
  {
    category: "Intelligence Tools",
    items: [
      { id: "blueprint", label: "Blueprint Generator", icon: Cpu, to: "/?action=blueprint" },
      { id: "buildguide", label: "Build Guide Video", icon: Hammer, to: "/?action=buildguide" },
      { id: "summarize", label: "Website Summarizer", icon: FileText, to: "/?action=summarize" },
      { id: "location", label: "Location Search", icon: MapPin, to: "/?action=location" },
      { id: "poi", label: "POI Discovery Engine", icon: Brain, to: "/?action=poi" },
      { id: "web", label: "Live Web Results", icon: Globe, to: "/?action=web" },
      { id: "trust", label: "Trust & Safety", icon: Shield, to: "/?action=trust" },
    ],
  },
  {
    category: "Governance",
    items: [
      { id: "policies", label: "Policies & Governance", icon: ScrollText, to: "/policies" },
      { id: "rights", label: "Rights & Ownership", icon: Shield, to: "/rights" },
    ],
  },
];

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, toggleLiteMode } = useAuth();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const handleClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        menuPanelRef.current &&
        !menuPanelRef.current.contains(target) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(target)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    // Defer attaching click handlers so the same tap that opened the menu doesn't close it
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("touchstart", handleClick);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [mobileOpen]);

  const handleClearHistory = () => {
    clearSearchHistory();
    toast({ title: "History cleared", description: "All search history has been removed." });
    setShowHistory(false);
  };

  const copyReferralCode = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    toast({ title: "Copied!", description: `Referral code ${profile.referral_code} copied.` });
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
      <div className="container mx-auto flex items-center justify-between h-14 px-4 gap-2">
        <Link to="/" className="flex items-center gap-2 group flex-1 sm:flex-initial">
          <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all bg-background shrink-0">
            <img src="/search-poi-logo.jpg" alt="SEARCH-POI logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-bold text-lg text-foreground tracking-tight">
              SEARCH<span className="text-primary">-POI</span>
            </span>
            <span className="hidden sm:inline text-[9px] text-muted-foreground font-medium tracking-wider uppercase mt-0.5">
              by POI Foundation
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-3 text-sm relative">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
          ))}

          <Link
            to="/referral"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
          >
            <Gift className="w-3.5 h-3.5" />
            Refer & Earn
          </Link>

          <Link
            to="/developer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-foreground hover:bg-accent/20 transition-colors font-medium"
          >
            <Code className="w-3.5 h-3.5" />
            API
          </Link>

          {user?.email === ADMIN_EMAIL && (
            <>
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
              <Link
                to="/admin/acquisition-control"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[hsl(45,90%,50%)]/10 text-[hsl(45,90%,55%)] hover:bg-[hsl(45,90%,50%)]/20 transition-colors font-medium"
              >
                <Star className="w-3.5 h-3.5" />
                Acquisition
              </Link>
            </>
          )}

          {/* Lite Mode Toggle */}
          {user && (
            <LiteModeToggle
              enabled={profile?.lite_mode ?? false}
              onToggle={() => toggleLiteMode()}
            />
          )}

          {/* POI Points */}
          {profile && (
            <Link to="/points" className="flex items-center gap-1 text-xs text-[hsl(45,90%,55%)] hover:text-[hsl(45,90%,65%)] transition-colors font-medium">
              <Trophy className="w-3.5 h-3.5" />
              {profile.poi_points} pts
            </Link>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Search History"
            >
              <Clock className="w-4 h-4" />
              <span>History</span>
            </button>
            <button
              onClick={handleClearHistory}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
              title="Clear search history"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {profile?.referral_code && (
            <button
              onClick={copyReferralCode}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md bg-primary/5 border border-primary/20 text-[10px] font-mono text-primary hover:bg-primary/10 transition-colors"
              title="Click to copy your referral code"
            >
              <Gift className="w-3 h-3" />
              {profile.referral_code}
              <Copy className="w-3 h-3 opacity-60" />
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/referral" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors" title="My Profile">
                <User className="w-4 h-4" />
                <span className="max-w-[80px] truncate">{profile?.display_name || "Account"}</span>
              </Link>
              {profile?.is_premium && (
                <span className="px-1.5 py-0.5 rounded-full bg-[hsl(45,90%,50%)]/15 text-[hsl(45,90%,55%)] text-[9px] font-bold uppercase">PRO</span>
              )}
              <button
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
          )}

        </nav>

      </div>

      {/* Tools menu dropdown — opened by floating button (all screens) */}
      {mobileOpen && (
        <div ref={menuPanelRef} className="fixed bottom-24 left-5 w-[calc(100vw-2.5rem)] sm:w-80 max-h-[70vh] overflow-y-auto glass border border-border/40 rounded-xl shadow-2xl px-4 py-3 flex flex-col gap-3 text-sm z-[55]">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">{l.label}</Link>
          ))}

          {/* Tools list */}
          <div className="border-t border-border/30 pt-3 flex flex-col gap-3">
            {TOOL_GROUPS.map((group) => (
              <div key={group.category} className="flex flex-col gap-1">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.category}
                </div>
                {group.items.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.id}
                      to={tool.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/20 transition-colors text-foreground/90"
                    >
                      <div className="p-1 rounded bg-primary/10">
                        <Icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-xs">{tool.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>

          <Link to="/referral" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-primary font-medium">
            <Gift className="w-4 h-4" /> Refer & Earn
          </Link>
          <Link to="/developer" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-medium">
            <Code className="w-4 h-4" /> Developer API
          </Link>
          {user?.email === ADMIN_EMAIL && (
            <>
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-destructive font-medium">
                <Shield className="w-4 h-4" /> Admin Dashboard
              </Link>
              <Link to="/admin/acquisition-control" onClick={() => setMobileOpen(false)} className="flex items-center gap-1.5 text-[hsl(45,90%,55%)] font-medium">
                <Star className="w-4 h-4" /> Acquisition Control
              </Link>
            </>
          )}
          {user && (
            <div className="flex items-center gap-2">
              <LiteModeToggle enabled={profile?.lite_mode ?? false} onToggle={() => toggleLiteMode()} />
              {profile && profile.poi_points > 0 && <POIPointsBadge points={profile.poi_points} />}
            </div>
          )}
          {profile?.referral_code && (
            <button
              onClick={() => { copyReferralCode(); setMobileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-primary text-sm font-medium"
            >
              <Gift className="w-4 h-4" />
              Your Code: <span className="font-mono">{profile.referral_code}</span>
              <Copy className="w-3 h-3 ml-auto opacity-70" />
            </button>
          )}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { setMobileOpen(false); setShowHistory(!showHistory); }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Clock className="w-4 h-4" /> History
            </button>
            <button
              onClick={() => { handleClearHistory(); setMobileOpen(false); }}
              className="flex items-center gap-1.5 text-destructive/80 hover:text-destructive text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
          {user ? (
            <>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{profile?.display_name || user.email}</span>
                {profile?.is_premium && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[hsl(45,90%,50%)]/15 text-[hsl(45,90%,55%)] text-[9px] font-bold uppercase">PRO</span>
                )}
              </div>
              <button onClick={() => { setMobileOpen(false); signOut(); }} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setMobileOpen(false)} className="text-primary font-medium">
              Sign In / Sign Up
            </Link>
          )}
        </div>
      )}

      {/* Global search history popover (desktop + mobile) */}
      {showHistory && (
        <div className="absolute right-2 sm:right-4 top-full mt-1 w-80 max-w-[calc(100vw-1rem)] z-50">
          <SearchHistory
            isOpen={showHistory}
            onClose={() => setShowHistory(false)}
            onSelect={(q) => {
              setShowHistory(false);
              navigate(`/search?q=${encodeURIComponent(q)}`);
            }}
          />
        </div>
      )}
    </header>

    {/* Floating glowing menu button — bottom-left corner (all screens) */}
    <button
      ref={menuButtonRef}
      onClick={(e) => { e.stopPropagation(); setMobileOpen((v) => !v); }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label="Toggle menu"
      aria-expanded={mobileOpen}
      className="fixed bottom-5 left-5 z-[60] w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_25px_5px_hsl(var(--primary)/0.55),0_10px_30px_-5px_hsl(var(--primary)/0.7),0_0_0_1px_hsl(var(--primary)/0.4)] hover:scale-110 active:scale-95 transition-transform animate-pulse-slow ring-2 ring-primary/40"
    >
      {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
    </>
  );
};

export default Header;

import { Link } from "react-router-dom";
import { Shield, Globe, Code, Heart } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/30 bg-card/20 backdrop-blur-xl mt-16">
    <div className="container mx-auto px-4 py-10 max-w-7xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-primary/30 bg-background">
              <img src="/search-poi-logo.jpg" alt="SEARCH-POI" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-foreground">
              SEARCH<span className="text-primary">-POI</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An independent intelligence engine.
            <br />
            Owned & operated by <span className="text-foreground font-medium">POI Foundation</span>.
          </p>
        </div>

        {/* Product */}
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition-colors">Search</Link></li>
            <li><Link to="/insights" className="hover:text-foreground transition-colors">Insights</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            <li><Link to="/premium" className="hover:text-foreground transition-colors">Premium</Link></li>
          </ul>
        </div>

        {/* Foundation */}
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Foundation</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground transition-colors">About POI</Link></li>
            <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
            <li><Link to="/policies" className="hover:text-foreground transition-colors">Policies</Link></li>
            <li><Link to="/rights" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Shield className="w-3 h-3" /> Rights & Ownership</Link></li>
            <li><Link to="/feedback" className="hover:text-foreground transition-colors">Feedback</Link></li>
          </ul>
        </div>

        {/* Build */}
        <div>
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Build</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/developer" className="hover:text-foreground transition-colors flex items-center gap-1.5"><Code className="w-3 h-3" /> Developer API</Link></li>
            <li><Link to="/business" className="hover:text-foreground transition-colors">Business Dashboard</Link></li>
            <li><Link to="/referral" className="hover:text-foreground transition-colors">Refer & Earn</Link></li>
            <li><Link to="/waitlist" className="hover:text-foreground transition-colors">Join Waitlist</Link></li>
          </ul>
        </div>
      </div>

      {/* Independence row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/30">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap justify-center">
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            Independent · Crawler-owned
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            African-first intelligence
          </span>
        </div>
        <div className="text-xs text-muted-foreground text-center sm:text-right">
          © {new Date().getFullYear()} <span className="text-foreground font-medium">POI Foundation</span> · Made with{" "}
          <Heart className="w-3 h-3 inline text-primary" /> in Nigeria
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;

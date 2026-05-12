import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const { toast } = useToast();

  const referralCode = searchParams.get("ref") || "";
  const [isLogin, setIsLogin] = useState(!referralCode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [refCode, setRefCode] = useState(referralCode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login Failed", description: error, variant: "destructive" });
      } else {
        toast({ title: "Welcome back!" });
        navigate("/");
      }
    } else {
      if (!displayName.trim()) {
        toast({ title: "Name required", description: "Please enter your display name", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast({ title: "Weak password", description: "Password must be at least 6 characters", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName, refCode || undefined);
      if (error) {
        toast({ title: "Signup Failed", description: error, variant: "destructive" });
      } else {
        // Capture IP address after signup
        try {
          const ipRes = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipRes.json();
          if (ipData.ip) {
            const { supabase } = await import("@/integrations/supabase/client");
            await supabase.rpc("update_signup_ip", { ip_address: ipData.ip });
          }
        } catch (e) {
          console.warn("Could not capture IP:", e);
        }
        toast({ title: "Account created!", description: "You can now sign in." });
        setIsLogin(true);
        setPassword("");
      }
    }
    setLoading(false);
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <SEOHead title="Verify Email — SEARCH-POI" description="Check your email to verify your SEARCH-POI account." path="/auth" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 max-w-md w-full text-center border border-border/30">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h2>
          <p className="text-muted-foreground mb-6">
            We sent a verification link to <span className="text-foreground font-medium">{email}</span>. Click the link to activate your account.
          </p>
          <p className="text-xs text-muted-foreground">Didn't receive it? Check your spam folder.</p>
          <button onClick={() => { setEmailSent(false); setIsLogin(true); }} className="mt-4 text-primary hover:underline text-sm">
            Back to login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEOHead title={isLogin ? "Login — SEARCH-POI" : "Sign Up — SEARCH-POI"} description="Join SEARCH-POI and refer friends to earn free premium access." path="/auth" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-8 max-w-md w-full border border-border/30">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl overflow-hidden ring-1 ring-primary/30 bg-background">
              <img src="/search-poi-logo.jpg" alt="SEARCH-POI logo" className="w-full h-full object-cover" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">
              SEARCH<span className="text-primary">-POI</span>
            </span>
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            {isLogin ? "Welcome Back" : "Join SEARCH-POI"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Sign in to your account" : "Create your free account"}
          </p>
        </div>

        {/* Referral badge */}
        {!isLogin && refCode && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 mb-4 text-sm">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">Referred by code: <span className="text-primary font-medium">{refCode}</span></span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Your name"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Referral Code (optional)</label>
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={refCode}
                  onChange={(e) => setRefCode(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/50 border border-border/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Enter referral code"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-border/40" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const { lovable } = await import("@/integrations/lovable/index");
              const result = await lovable.auth.signInWithOAuth("google", {
                redirect_uri: window.location.origin,
              });
              if (result.error) {
                toast({ title: "Google Sign-In Failed", description: String(result.error), variant: "destructive" });
              } else if (!result.redirected) {
                toast({ title: "Welcome!" });
                navigate("/");
              }
            } catch (err) {
              toast({ title: "Google Sign-In Failed", description: "Something went wrong", variant: "destructive" });
            }
            setLoading(false);
          }}
          className="w-full py-2.5 rounded-xl border border-border/30 bg-secondary/50 text-foreground font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="text-primary font-medium">{isLogin ? "Sign Up" : "Sign In"}</span>
          </button>
        </div>

        <p className="mt-5 text-center text-[10px] text-muted-foreground tracking-wider uppercase">
          An independent product of <span className="text-primary font-semibold">POI Foundation</span>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;

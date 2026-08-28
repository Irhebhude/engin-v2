import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  referral_code: string;
  referred_by: string | null;
  email_verified: boolean;
  search_count: number;
  created_at: string;
  is_premium: boolean;
  poi_points: number;
  lite_mode: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggleLiteMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (data) setProfile(data as unknown as Profile);
    } catch {
      // Profile table may not exist or Supabase may be unreachable
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  const toggleLiteMode = async () => {
    if (!user || !profile) return;
    const newVal = !profile.lite_mode;
    try {
      await supabase.from("profiles").update({ lite_mode: newVal } as any).eq("id", user.id);
    } catch { /* Supabase unavailable */ }
    setProfile((p) => p ? { ...p, lite_mode: newVal } : p);
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, referralCode?: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Authentication is not configured. Please contact the administrator." };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName },
      },
    });
    if (error) return { error: error.message };

    if (referralCode && data.user) {
      setTimeout(async () => {
        try {
          await supabase.rpc("process_referral", { referral_code_input: referralCode });
        } catch { /* referral processing unavailable */ }
      }, 1000);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: "Authentication is not configured. Please contact the administrator." };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const pendingCode = localStorage.getItem("pending_referral_code");
    if (pendingCode) {
      try {
        await supabase.rpc("process_referral", { referral_code_input: pendingCode });
      } catch { /* referral processing unavailable */ }
      localStorage.removeItem("pending_referral_code");
    }

    return { error: null };
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return { error: "Authentication is not configured. Please contact the administrator." };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch { /* signout may fail if Supabase is down */ }
    setUser(null);
    setSession(null);
    setProfile(null);
    // Clear any stale localStorage auth data
    try {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith("sb-") || key.includes("supabase")) {
          localStorage.removeItem(key);
        }
      }
    } catch { /* localStorage may be unavailable */ }
    // Navigate to home
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signInWithGoogle, signOut, refreshProfile, toggleLiteMode }}>
      {children}
    </AuthContext.Provider>
  );
};

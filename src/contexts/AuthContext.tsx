import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  displayName?: string;
  referralCode?: string;
}

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
  session: any;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, referralCode?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

async function apiFetch(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch("/api/auth/me");
      if (data?.user) {
        setUser(data.user);
        if (data.profile) setProfile(data.profile);
      }
    } catch {
      setUser(null);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const toggleLiteMode = async () => {
    if (!user || !profile) return;
    const newVal = !profile.lite_mode;
    setProfile((p) => p ? { ...p, lite_mode: newVal } : p);
  };

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string, displayName: string, referralCode?: string) => {
    try {
      const data = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName, referralCode }),
      });
      if (data?.user) {
        setUser(data.user);
        setSession({ user: data.user });
      }
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Signup failed" };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data?.user) {
        setUser(data.user);
        setSession({ user: data.user });
      }
      return { error: null };
    } catch (e: any) {
      return { error: e.message || "Login failed" };
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    setUser(null);
    setSession(null);
    setProfile(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signUp, signIn, signOut, refreshProfile, toggleLiteMode }}>
      {children}
    </AuthContext.Provider>
  );
};

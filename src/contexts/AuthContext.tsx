import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { cf, type CfUser, type CfProfile } from "@/integrations/cf/client";

interface AuthContextType {
  user: CfUser | null;
  session: CfUser | null; // legacy alias for compatibility
  profile: CfProfile | null;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<CfUser | null>(null);
  const [profile, setProfile] = useState<CfProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    const { data } = await cf.auth.getUser();
    if (data?.user) {
      setUser(data.user);
      setProfile(data.profile ?? null);
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  };

  const refreshProfile = async () => {
    const { data } = await cf.data.get<CfProfile>("profiles");
    if (data) setProfile(data);
  };

  const toggleLiteMode = async () => {
    if (!profile) return;
    const newVal = !profile.lite_mode;
    await cf.data.patch("profiles", { lite_mode: newVal });
    setProfile((p) => (p ? { ...p, lite_mode: newVal } : p));
  };

  useEffect(() => {
    loadMe();
    const { unsubscribe } = cf.auth.onAuthStateChange((_event, u) => {
      if (u) loadMe();
      else { setUser(null); setProfile(null); }
    });
    return () => { unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, displayName: string, referralCode?: string) => {
    const { error } = await cf.auth.signUp(email, password, displayName, referralCode);
    if (!error) await loadMe();
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await cf.auth.signIn(email, password);
    if (!error) await loadMe();
    return { error };
  };

  const signOut = async () => {
    await cf.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session: user, profile, loading, signUp, signIn, signOut, refreshProfile, toggleLiteMode }}>
      {children}
    </AuthContext.Provider>
  );
};

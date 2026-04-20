import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "driver" | "rider";

export interface ProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  email?: string | null;
  address?: string | null;
  bio?: string | null;
}

export type DriverVerificationStatus = "pending" | "verified" | "rejected" | null;

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  roles: AppRole[];
  driverVerificationStatus: DriverVerificationStatus;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [driverVerificationStatus, setDriverVerificationStatus] =
    useState<DriverVerificationStatus>(null);
  const [loading, setLoading] = useState(true);

  const loadProfileAndRoles = useCallback(async (uid: string) => {
    const [profRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((profRes.data as ProfileRow) ?? null);
    const userRoles = ((rolesRes.data ?? []) as { role: AppRole }[]).map((r) => r.role);
    setRoles(userRoles);

    if (userRoles.includes("driver")) {
      const { data: drv } = await supabase
        .from("drivers")
        .select("verification_status")
        .eq("id", uid)
        .maybeSingle();
      setDriverVerificationStatus((drv?.verification_status as DriverVerificationStatus) ?? "pending");
    } else {
      setDriverVerificationStatus(null);
    }
  }, []);

  useEffect(() => {
    // Listener FIRST (per best-practice)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // defer to avoid recursive auth deadlock
        setTimeout(() => loadProfileAndRoles(sess.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
        setDriverVerificationStatus(null);
      }
    });

    // Then read existing
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        loadProfileAndRoles(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfileAndRoles]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfileAndRoles(user.id);
  }, [user, loadProfileAndRoles]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setDriverVerificationStatus(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, roles, driverVerificationStatus, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}

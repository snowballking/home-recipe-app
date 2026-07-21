"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface AuthUser {
  id: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  displayName: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  displayName: "",
  loading: true,
});

/**
 * Resolves the signed-in user once and holds it. Lives in the root layout so
 * it persists across client-side navigations — the NavBar reads from here
 * instead of re-fetching on every mount, which is what caused its tab set to
 * flicker (logged-out 4 tabs → logged-in 6 tabs) on each page change.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadProfile(u: AuthUser | null) {
      if (!u) {
        setIsAdmin(false);
        setDisplayName("");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, displayname")
        .eq("id", u.id)
        .maybeSingle();
      if (!active) return;
      setIsAdmin(!!profile?.is_admin);
      setDisplayName(profile?.displayname ?? u.email?.split("@")[0] ?? "User");
    }

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!active) return;
        const u = data.user ? { id: data.user.id, email: data.user.email } : null;
        setUser(u);
        await loadProfile(u);
      } catch {
        /* auth lock race — safe to ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();

    // Keep the nav in sync on login/logout. Supabase warns against calling
    // other client methods directly inside this callback (can deadlock), so
    // defer the profile lookup to a microtask.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const u = session?.user ? { id: session.user.id, email: session.user.email } : null;
      setUser(u);
      setTimeout(() => {
        if (active) loadProfile(u);
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, displayName, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

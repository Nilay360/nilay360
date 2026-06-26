"use client";
import {
  createContext, useContext, useState, useEffect, useCallback, useMemo, useRef,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuthMode = "signin" | "register";

export interface AuthProfile {
  id:          string;
  full_name:   string | null;
  phone:       string | null;
  city:        string | null;
  role:        string | null;
  is_verified: boolean | null;
}

type AuthCtx = {
  user:           User | null;
  profile:        AuthProfile | null;
  loading:        boolean;
  isModalOpen:    boolean;
  mode:           AuthMode;
  openAuthModal:  (mode?: AuthMode) => void;
  closeAuthModal: () => void;
  /** Re-read the session + profile (call right after a successful auth). */
  refreshAuth:    () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<AuthProfile | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode,        setMode]        = useState<AuthMode>("signin");

  const mountedRef = useRef(true);

  const fetchProfile = useCallback(async (userId: string): Promise<AuthProfile | null> => {
    const supabase = createClient();
    try {
      // role is a USER-DEFINED enum — cast to text so the query resolves.
      // maybeSingle() returns null (rather than throwing) when no row exists.
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, city, role::text, is_verified")
        .eq("id", userId)
        .maybeSingle();
      return (data as AuthProfile | null) ?? null;
    } catch {
      return null;
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mountedRef.current) return;
      if (session?.user) {
        setUser(session.user);
        const p = await fetchProfile(session.user.id);
        if (mountedRef.current) setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (e) {
      console.error("AuthContext refresh error:", e);
    }
  }, [fetchProfile]);

  useEffect(() => {
    mountedRef.current = true;
    const supabase = createClient();

    // Safety timeout — if auth doesn't resolve in 5s (e.g. a stalled session
    // read), unblock the UI rather than spinning forever.
    const safetyTimer = setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 5000);

    // Syncing React state from Supabase's external auth system (async).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAuth().finally(() => {
      clearTimeout(safetyTimer);
      if (mountedRef.current) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        if (!mountedRef.current) return;
        if (session?.user) {
          const userId = session.user.id;
          setUser(session.user);
          // Defer the profile query out of this callback: Supabase holds an
          // internal auth lock while it runs, and awaiting a DB query here
          // deadlocks (the query needs the same lock). setTimeout(0) lets the
          // lock release first.
          setTimeout(() => {
            void fetchProfile(userId).then(p => {
              if (mountedRef.current) setProfile(p);
            });
          }, 0);
        } else {
          setUser(null);
          setProfile(null);
        }
      },
    );

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [refreshAuth, fetchProfile]);

  const openAuthModal = useCallback((m: AuthMode = "signin") => {
    setMode(m);
    setIsModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (isModalOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isModalOpen]);

  const value = useMemo<AuthCtx>(() => ({
    user, profile, loading, isModalOpen, mode,
    openAuthModal, closeAuthModal, refreshAuth,
  }), [user, profile, loading, isModalOpen, mode, openAuthModal, closeAuthModal, refreshAuth]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback if used outside the provider (avoids crashes during
    // isolated renders / tests).
    return {
      user: null, profile: null, loading: false,
      isModalOpen: false, mode: "signin",
      openAuthModal: () => {}, closeAuthModal: () => {},
      refreshAuth: async () => {},
    };
  }
  return ctx;
}

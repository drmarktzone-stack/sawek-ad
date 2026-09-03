"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setClientPlan, type PlanId } from "@/lib/plan";

export type AuthUser = { id: string; email: string };

type AuthValue = {
  ready: boolean;
  user: AuthUser | null;
  plan: PlanId;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ ok: boolean; needsEmail?: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plan, setPlan] = useState<PlanId>("free");

  const apply = useCallback((nextUser: AuthUser | null, nextPlan: PlanId) => {
    setUser(nextUser);
    setPlan(nextPlan);
    setClientPlan(nextPlan, nextUser?.email);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", { credentials: "include" });
      const data = (await res.json()) as { user?: AuthUser | null; plan?: PlanId };
      apply(data.user ?? null, data.plan === "pro" ? "pro" : "free");
    } catch {
      apply(null, "free");
    } finally {
      setReady(true);
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (typeof window !== "undefined") {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const access = hash.get("access_token") || "";
        const refreshToken = hash.get("refresh_token") || "";
        if (access && refreshToken) {
          try {
            const res = await fetch("/api/auth/oauth-tokens", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ access_token: access, refresh_token: refreshToken }),
            });
            const url = new URL(window.location.href);
            url.hash = "";
            url.searchParams.delete("error");
            window.history.replaceState(null, "", url.pathname + url.search);
            if (res.ok && !cancelled) {
              await refresh();
              window.location.replace("/");
              return;
            }
          } catch {
            /* fall through to session refresh */
          }
        }
      }
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; user?: AuthUser; plan?: PlanId; error?: string };
      if (!data.ok || !data.user) return { ok: false, error: data.error || "auth" };
      apply(data.user, data.plan === "pro" ? "pro" : "free");
      return { ok: true };
    } catch {
      return { ok: false, error: "network" };
    }
  }, [apply]);

  const signup = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok?: boolean; user?: AuthUser | null; plan?: PlanId; needsEmail?: boolean; error?: string };
      if (!data.ok) return { ok: false, error: data.error || "auth" };
      if (data.user) apply(data.user, data.plan === "pro" ? "pro" : "free");
      return { ok: true, needsEmail: data.needsEmail };
    } catch {
      return { ok: false, error: "network" };
    }
  }, [apply]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      /* ignore */
    }
    apply(null, "free");
  }, [apply]);

  const value = useMemo<AuthValue>(
    () => ({ ready, user, plan, login, signup, logout, refresh }),
    [ready, user, plan, login, signup, logout, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}

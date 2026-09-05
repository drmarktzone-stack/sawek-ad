"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { withLang } from "@/lib/locale-url";

function looksLikeDump(s: string): boolean {
  const t = s.trim();
  return t.startsWith("{") || t.startsWith("[") || /error_code|unsupported provider|provider is not enabled/i.test(t);
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { t, locale } = useI18n();
  const { login, signup } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [needsEmail, setNeedsEmail] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState<boolean | null>(null);

  const qErr = params.get("error");
  const googleOffQuery = qErr === "google_off" || qErr === "google";

  function messageFor(code: string | undefined, fallbackKey: "auth.error" | "auth.signupError"): string {
    switch (code) {
      case "invalid_credentials":
        return t("auth.error.invalid_credentials");
      case "email_not_confirmed":
        return t("auth.error.email_not_confirmed");
      case "already_registered":
        return t("auth.error.already_registered");
      case "weak_password":
        return t("auth.error.weak_password");
      case "google":
      case "google_off":
        return t("auth.googleOff");
      case "no_supabase":
        return t("auth.noSupabase");
      case "network":
        return t("auth.error.network");
      case "invalid":
        return t("auth.error.invalid");
      default:
        return t(fallbackKey);
    }
  }

  useEffect(() => {
    if (qErr === "no_supabase") setError(t("auth.noSupabase"));
    else if (qErr === "auth") {
      // Implicit Google tokens sit in the hash; AuthProvider is exchanging them.
      if (typeof window !== "undefined") {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        if (hash.get("access_token")) return;
      }
      setError(t("auth.error"));
    }
  }, [qErr, t]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/google?json=1&probe=1", { headers: { Accept: "application/json" }, cache: "no-store", credentials: "include" })
      .then(async (r) => {
        const data = (await r.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
        if (cancelled) return;
        const on = r.ok && data.ok === true && typeof data.url === "string" && data.url.length > 0;
        setGoogleReady(on);
      })
      .catch(() => {
        if (!cancelled) setGoogleReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setErrorDetail("");
    try {
      if (mode === "login") {
        const r = await login(email, password);
        if (!r.ok) {
          setError(messageFor(r.error, "auth.error"));
          return;
        }
        router.push(withLang("/", locale));
      } else {
        const r = await signup(email, password);
        if (!r.ok) {
          setError(messageFor(r.error, "auth.signupError"));
          return;
        }
        if (r.needsEmail) {
          setNeedsEmail(true);
          return;
        }
        router.push(withLang("/", locale));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setGoogleBusy(true);
    setError("");
    setErrorDetail("");
    try {
      const res = await fetch("/api/auth/google?json=1", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string; detail?: string };
      if (
        !res.ok ||
        !data.ok ||
        !data.url ||
        !/^https?:\/\//i.test(data.url) ||
        data.error === "google_off" ||
        data.error === "google"
      ) {
        setGoogleReady(false);
        setError(t("auth.googleOff"));
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t("auth.error.network"));
    } finally {
      setGoogleBusy(false);
    }
  }

  if (needsEmail) {
    return (
      <div className="relative mx-auto max-w-md overflow-hidden px-4 py-14">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div className="relative">
        <div className="agency-ink p-8 text-start">
          <Mail className="size-10 text-[#9FD4C8]" />
          <h1 className="agency-display-cream mt-3 text-3xl">{t("auth.checkEmailTitle")}</h1>
          <p className="mt-3 text-base font-semibold leading-relaxed text-[#E8E2D4]">{t("auth.checkEmail")}</p>
          <p className="mt-2 text-sm text-[#C9D0D8]" dir="ltr">
            {email}
          </p>
          <Button asChild className="mt-6 w-full">
            <LangLink href="/login">{t("auth.submit.login")}</LangLink>
          </Button>
        </div>
      </div>
      </div>
    );
  }

  const showGoogleOff = googleReady === false || googleOffQuery;
  const formError = error === t("auth.googleOff") ? "" : error;
  const formDetail = errorDetail && !looksLikeDump(errorDetail) ? errorDetail : "";

  return (
    <div className="relative mx-auto max-w-md overflow-hidden px-4 py-14">
      <div aria-hidden className="agency-grain absolute inset-0" />
      <div className="relative">
      <div className="agency-ink mb-6 p-6">
        <p className="text-[12px] font-black uppercase tracking-[0.22em] text-[#9FD4C8]">SAWEK AD</p>
        <h1 className="agency-display-cream mt-2 text-3xl">{t(mode === "login" ? "auth.title.login" : "auth.title.signup")}</h1>
        <p className="mt-2 text-sm font-semibold text-[#E8E2D4]">{t(mode === "login" ? "auth.lead.login" : "auth.lead.signup")}</p>
        <p className="mt-2 text-base text-[#C9D0D8]">{t("plan.freeBanner")}</p>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-0 space-y-4 agency-board p-6">
        <div>
          <Label htmlFor="email" className="text-base font-black text-navy">
            {t("auth.email")}
          </Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </div>
        <div>
          <Label htmlFor="password" className="text-base font-black text-navy">
            {t("auth.password")}
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </div>
        {formError ? <p className="text-sm font-black text-danger">{formError}</p> : null}
        {formDetail ? (
          <p className="text-xs text-muted" dir="ltr">
            {formDetail}
          </p>
        ) : null}
        <Button type="submit" className="w-full text-base font-black" disabled={busy}>
          {busy ? t("auth.busy") : t(mode === "login" ? "auth.submit.login" : "auth.submit.signup")}
        </Button>
      </form>
      {googleReady === true ? (
        <>
          <p className="my-4 text-center text-sm font-bold uppercase tracking-[0.18em] text-muted">{t("auth.or")}</p>
          <Button type="button" variant="outline" className="w-full" disabled={googleBusy} onClick={() => void onGoogle()}>
            {googleBusy ? t("auth.busy") : t("auth.google")}
          </Button>
        </>
      ) : null}
      {showGoogleOff ? <p className="mt-4 text-sm font-semibold text-danger">{t("auth.googleOff")}</p> : null}
      <p className="mt-4 text-center text-sm">
        {mode === "login" ? (
          <LangLink href="/signup" className="font-semibold text-navy underline">
            {t("auth.needAccount")}
          </LangLink>
        ) : (
          <LangLink href="/login" className="font-semibold text-navy underline">
            {t("auth.haveAccount")}
          </LangLink>
        )}
      </p>
      </div>
    </div>
  );
}

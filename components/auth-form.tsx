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
  const [googleDetail, setGoogleDetail] = useState("");

  const qErr = params.get("error");

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
    if (qErr === "google") setError(t("auth.googleOff"));
    else if (qErr === "no_supabase") setError(t("auth.noSupabase"));
    else if (qErr === "auth") setError(t("auth.error"));
  }, [qErr, t]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/google?json=1", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then((r) => r.json() as Promise<{ ok?: boolean; error?: string; detail?: string }>)
      .then((data) => {
        if (cancelled || data.ok) return;
        if (data.error === "no_supabase") setGoogleDetail(t("auth.noSupabase"));
        else setGoogleDetail(t("auth.googleOff"));
      })
      .catch(() => {
        /* leave Google as clickable; click path reports network */
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
      });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string; detail?: string };
      if (!data.ok || !data.url) {
        setError(messageFor(data.error || "google", "auth.error"));
        if (data.detail) setErrorDetail(data.detail);
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
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-[28px] border border-gold/50 bg-white p-6 text-start shadow-[0_10px_32px_rgba(27,42,74,0.07)]">
          <Mail className="size-10 text-gold" />
          <h1 className="mt-3 text-3xl font-black text-navy">{t("auth.checkEmailTitle")}</h1>
          <p className="mt-3 text-base font-semibold leading-relaxed text-navy">{t("auth.checkEmail")}</p>
          <p className="mt-2 text-sm text-muted" dir="ltr">
            {email}
          </p>
          <Button asChild className="mt-6 w-full">
            <LangLink href="/login">{t("auth.submit.login")}</LangLink>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-black text-navy">{t(mode === "login" ? "auth.title.login" : "auth.title.signup")}</h1>
      <p className="mt-2 text-sm font-semibold text-navy">{t(mode === "login" ? "auth.lead.login" : "auth.lead.signup")}</p>
      <p className="mt-2 text-sm text-muted">{t("plan.freeBanner")}</p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-3 rounded-[22px] border border-navy/10 bg-white p-5 shadow-[0_10px_32px_rgba(27,42,74,0.07)]">
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
        {error ? <p className="text-sm font-black text-omni-red">{error}</p> : null}
        {errorDetail ? (
          <p className="text-xs text-muted" dir="ltr">
            {errorDetail}
          </p>
        ) : null}
        <Button type="submit" className="w-full text-base font-black" disabled={busy}>
          {busy ? t("auth.busy") : t(mode === "login" ? "auth.submit.login" : "auth.submit.signup")}
        </Button>
      </form>
      <p className="my-4 text-center text-sm font-bold uppercase tracking-[0.18em] text-muted">{t("auth.or")}</p>
      <p className="mb-2 text-center text-xs text-muted">{t("auth.googleSecondary")}</p>
      <Button type="button" variant="outline" className="w-full" disabled={googleBusy} onClick={() => void onGoogle()}>
        {googleBusy ? t("auth.busy") : t("auth.google")}
      </Button>
      {googleDetail ? <p className="mt-2 text-sm font-semibold text-omni-red">{googleDetail}</p> : null}
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
  );
}

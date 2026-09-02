"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const [info, setInfo] = useState("");

  const qErr = params.get("error");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (mode === "login") {
        const r = await login(email, password);
        if (!r.ok) {
          setError(t("auth.error"));
          return;
        }
        router.push(withLang("/", locale));
      } else {
        const r = await signup(email, password);
        if (!r.ok) {
          setError(t("auth.signupError"));
          return;
        }
        if (r.needsEmail) {
          setInfo(t("auth.checkEmail"));
          return;
        }
        router.push(withLang("/", locale));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-black text-navy">{t(mode === "login" ? "auth.title.login" : "auth.title.signup")}</h1>
      <p className="mt-2 text-sm text-muted">{t("plan.freeBanner")}</p>
      <Button asChild variant="outline" className="mt-6 w-full">
        <a href="/api/auth/google">{t("auth.google")}</a>
      </Button>
      {(qErr === "google" || qErr === "no_supabase") && (
        <p className="mt-2 text-sm text-omni-red">{qErr === "no_supabase" ? t("auth.noSupabase") : t("auth.googleOff")}</p>
      )}
      <p className="my-4 text-center text-sm font-bold uppercase tracking-[0.18em] text-muted">{t("auth.or")}</p>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3 rounded-[22px] border border-navy/10 bg-white p-5 shadow-[0_10px_32px_rgba(27,42,74,0.07)]">
        <div>
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </div>
        <div>
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
        </div>
        {error ? <p className="text-sm font-semibold text-omni-red">{error}</p> : null}
        {info ? <p className="text-sm text-navy">{info}</p> : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t("auth.busy") : t(mode === "login" ? "auth.submit.login" : "auth.submit.signup")}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm">
        {mode === "login" ? (
          <LangLink href="/signup" className="font-semibold text-navy underline">{t("auth.needAccount")}</LangLink>
        ) : (
          <LangLink href="/login" className="font-semibold text-navy underline">{t("auth.haveAccount")}</LangLink>
        )}
      </p>
    </div>
  );
}

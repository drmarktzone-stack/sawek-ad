"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/types";
import { loadLocale, saveLocale, savePackLang } from "@/lib/storage";
import { dirFor, t as translate } from "@/lib/i18n";
import { useIsClient } from "@/lib/use-is-client";
import { readLocaleFromLocation, writeLocaleToLocation } from "@/lib/locale-url";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "rtl" | "ltr";
  t: (key: Parameters<typeof translate>[1]) => string;
}

const Ctx = createContext<I18nValue | null>(null);

function resolveLocale(): Locale {
  return readLocaleFromLocation() ?? loadLocale();
}

function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = dirFor(locale);
  document.documentElement.classList.add("dark");
  document.title =
    locale === "ar" ? "سوِّق إعلانك بنفسك" : locale === "he" ? "SAWEK AD — סאווק / سوِّق إعلانك بنفسك" : "SAWEK AD — سوِّق إعلانك بنفسك / סאווק";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const client = useIsClient();
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>("he");
  const [ready, setReady] = useState(false);

  if (client && !ready) {
    const resolved = resolveLocale();
    setLocaleState(resolved);
    saveLocale(resolved);
    savePackLang(resolved);
    setReady(true);
  }

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
    savePackLang(l);
    writeLocaleToLocation(l);
    applyDocumentLocale(l);
  }, []);

  useEffect(() => {
    if (!client) return;
    const fromUrl = readLocaleFromLocation();
    const stored = loadLocale();
    const next = fromUrl ?? stored;
    setLocaleState((prev) => (prev === next ? prev : next));
    saveLocale(next);
    savePackLang(next);
    writeLocaleToLocation(next);
    applyDocumentLocale(next);
  }, [client, pathname]);

  useEffect(() => {
    if (!client) return;
    const sync = () => {
      const fromUrl = readLocaleFromLocation();
      const stored = loadLocale();
      const next = fromUrl ?? stored;
      setLocaleState((prev) => (prev === next ? prev : next));
      saveLocale(next);
      writeLocaleToLocation(next);
      applyDocumentLocale(next);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [client]);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      dir: dirFor(locale),
      t: (key) => translate(locale, key),
    }),
    [locale, setLocale],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside provider");
  return v;
}

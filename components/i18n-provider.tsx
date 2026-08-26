"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import { loadLocale, saveLocale } from "@/lib/storage";
import { dirFor, t as translate } from "@/lib/i18n";
import { useIsClient } from "@/lib/use-is-client";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  dir: "rtl" | "ltr";
  t: (key: Parameters<typeof translate>[1]) => string;
}

const Ctx = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const client = useIsClient();
  const [locale, setLocaleState] = useState<Locale>("he");
  const [ready, setReady] = useState(false);

  if (client && !ready) {
    setLocaleState(loadLocale());
    setReady(true);
  }

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    saveLocale(l);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
    document.documentElement.classList.add("dark");
  }, [locale, ready]);

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

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

const KEY = "sawek-pwa-hint-seen";

export function PwaInstallHint() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
      const standalone = window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
      if (standalone) return;
    } catch {
      return;
    }
    setShow(true);
  }, [pathname]);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="mx-auto mt-4 flex max-w-xl items-center justify-between gap-3 rounded-full border border-navy/10 bg-white px-4 py-2 text-sm text-navy shadow-[0_8px_24px_rgba(27,42,74,0.06)]">
      <p className="font-semibold">{t("pwa.install")}</p>
      <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
        {t("pwa.dismiss")}
      </Button>
    </div>
  );
}

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const url = "/sw.js";
    navigator.serviceWorker.register(url).catch(() => {
      /* Next 16 / private mode — ignore */
    });
  }, []);
  return null;
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Smartphone } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";

const KEY = "sawek-pwa-hint-seen";

function detectPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

export function PwaInstallHint() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (pathname !== "/") return;
    try {
      if (localStorage.getItem(KEY) === "1") return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone));
      if (standalone) return;
    } catch {
      return;
    }
    setPlatform(detectPlatform());
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

  const how =
    platform === "ios"
      ? t("pwa.how.ios")
      : platform === "android"
        ? t("pwa.how.android")
        : t("pwa.how.generic");

  return (
    <div
      role="status"
      className="mx-auto mt-5 flex w-full max-w-xl flex-col gap-3 rounded-[16px] border border-white/15 bg-white/10 px-4 py-3.5 text-start text-[#F7F3EA] backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-[#9FD4C8]">
          <Smartphone className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-base font-black leading-snug">{t("pwa.install")}</p>
          <p className="mt-1 text-sm leading-relaxed text-[#C9D0D8]">{how}</p>
        </div>
      </div>
      <Button type="button" size="sm" variant="ghost" className="tap-target shrink-0 self-stretch text-[#F7F3EA] hover:bg-white/10 hover:text-white sm:self-center" onClick={dismiss}>
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

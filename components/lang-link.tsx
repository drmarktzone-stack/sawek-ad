"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { withLang } from "@/lib/locale-url";
import { useI18n } from "./i18n-provider";

/** Next.js Link that never drops `?lang=` on navigation. */
export function LangLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const { locale } = useI18n();
  const next = typeof href === "string" ? withLang(href, locale) : href;
  return <Link href={next} {...rest} />;
}

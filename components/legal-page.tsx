"use client";

import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { PRIVACY, TERMS, type LegalDoc } from "@/lib/legal";
import { CONTACT_EMAIL } from "@/lib/site";

export function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const { t, locale } = useI18n();
  const doc: LegalDoc = kind === "privacy" ? PRIVACY : TERMS;
  const otherHref = kind === "privacy" ? "/terms" : "/privacy";
  const otherKey = kind === "privacy" ? "nav.terms" : "nav.privacy";

  return (
    <div className="relative overflow-hidden">
      <section className="relative isolate overflow-hidden agency-hero-glow">
        <div aria-hidden className="agency-grain absolute inset-0 opacity-20" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{ backgroundImage: "url(/textures/hero-arc.svg)", backgroundSize: "cover", backgroundPosition: "center top" }}
        />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-[#F3EFE6]" />
        <div className="relative mx-auto max-w-3xl px-4 pb-14 pt-10 sm:pb-16 sm:pt-16">
          <p className="agency-kicker mb-4 text-center text-[#9FD4C8]">{t("brand.name")}</p>
          <span className="agency-rule mx-auto mb-6 bg-[#9FD4C8]" />
          <h1
            className="agency-display-cream mx-auto max-w-4xl text-center text-[2.2rem] leading-[1.15] sm:text-5xl"
            style={{ fontFamily: "var(--font-display-he), ui-serif, Georgia, serif" }}
          >
            {doc.title[locale]}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-center text-base font-semibold leading-relaxed text-[#E8E2D4] sm:text-lg">
            {doc.lead[locale]}
          </p>
          <p className="mt-4 text-center text-sm font-bold text-[#9FD4C8]">{doc.updated[locale]}</p>
        </div>
      </section>

      <article className="relative mx-auto max-w-3xl px-4 pb-10">
        <div className="agency-board space-y-10 p-6 sm:p-10">
          {doc.sections.map((section) => (
            <section key={section.h.en}>
              <h2 className="agency-display text-2xl sm:text-3xl">{section.h[locale]}</h2>
              <span className="agency-rule mt-3" />
              {section.p.map((para) => (
                <p key={para.en} className="mt-4 text-base leading-relaxed text-navy/85">
                  {para[locale]}
                </p>
              ))}
            </section>
          ))}
        </div>

        <aside className="agency-ink mt-8 rounded-[20px] p-6 text-start shadow-[var(--shadow-lift)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9FD4C8]">{t("legal.contact")}</p>
          <p className="mt-3 text-base leading-relaxed text-[#E8E2D4]">{t("legal.contactLead")}</p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-4 inline-flex min-h-12 items-center text-lg font-black text-[#F7F3EA] underline decoration-teal underline-offset-4 hover:text-white"
          >
            {CONTACT_EMAIL}
          </a>
        </aside>

        <nav aria-label={t("legal.more")} className="mt-8 flex flex-wrap items-center justify-center gap-3 pb-16">
          <Button asChild variant="outline">
            <LangLink href={otherHref}>{t(otherKey)}</LangLink>
          </Button>
          <Button asChild variant="outline">
            <LangLink href="/about">{t("nav.about")}</LangLink>
          </Button>
          <Button asChild variant="outline">
            <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
          </Button>
          <Button asChild variant="coral">
            <LangLink href="/">{t("home.cta.primary")}</LangLink>
          </Button>
        </nav>
      </article>
    </div>
  );
}

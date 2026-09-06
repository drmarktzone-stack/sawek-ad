"use client";

import {
  CalendarDays,
  Clapperboard,
  Images,
  Languages,
  Link2,
  MessageSquareText,
  ScanSearch,
  Sparkles,
  Stethoscope,
  Store,
  UtensilsCrossed,
  Workflow,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { Button } from "@/components/ui/button";
import { DemoPicker } from "@/components/demo-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PRICE_MONTHLY_ILS, PRICE_YEARLY_ILS } from "@/lib/plan";
import { beginNewCampaign } from "@/lib/empty-campaign";

const HOW = [
  { title: "about.how.1", body: "about.how.1b", icon: Link2, accent: "#0C7A6B" },
  { title: "about.how.2", body: "about.how.2b", icon: MessageSquareText, accent: "#10233F" },
  { title: "about.how.3", body: "about.how.3b", icon: ScanSearch, accent: "#5C4D86" },
  { title: "about.how.4", body: "about.how.4b", icon: Images, accent: "#E24B3A" },
  { title: "about.how.5", body: "about.how.5b", icon: Sparkles, accent: "#0A4F4A" },
] as const;

const PACK = [
  { title: "about.pack.text.h", body: "about.pack.text.p", icon: Languages },
  { title: "about.pack.visual.h", body: "about.pack.visual.p", icon: Images },
  { title: "about.pack.calendar.h", body: "about.pack.calendar.p", icon: CalendarDays },
  { title: "about.pack.viral.h", body: "about.pack.viral.p", icon: Clapperboard },
] as const;

const WHO = [
  { key: "about.who.1" as const, icon: Stethoscope },
  { key: "about.who.2" as const, icon: UtensilsCrossed },
  { key: "about.who.3" as const, icon: Store },
  { key: "about.who.4" as const, icon: Workflow },
];

const TECH = [
  { h: "about.tech.pro.h", p: "about.tech.pro.p" },
  { h: "about.tech.flash.h", p: "about.tech.flash.p" },
  { h: "about.tech.imagen.h", p: "about.tech.imagen.p" },
  { h: "about.tech.translate.h", p: "about.tech.translate.p" },
] as const;

const FAQ = [
  ["about.faq.1q", "about.faq.1a"],
  ["about.faq.2q", "about.faq.2a"],
  ["about.faq.3q", "about.faq.3a"],
  ["about.faq.4q", "about.faq.4a"],
  ["about.faq.5q", "about.faq.5a"],
  ["about.faq.6q", "about.faq.6a"],
  ["about.faq.7q", "about.faq.7a"],
] as const;

const VS_ROWS = [
  ["about.vs.rowWhat", "about.vs.rowChatIn", "about.vs.rowOrdIn", "about.vs.rowSawekIn"],
  ["about.vs.rowFacts", "about.vs.rowChatFacts", "about.vs.rowOrdFacts", "about.vs.rowSawekFacts"],
  ["about.vs.rowOut", "about.vs.rowChatOut", "about.vs.rowOrdOut", "about.vs.rowSawekOut"],
  ["about.vs.rowScore", "about.vs.rowChatScore", "about.vs.rowOrdScore", "about.vs.rowSawekScore"],
  ["about.vs.rowLang", "about.vs.rowChatLang", "about.vs.rowOrdLang", "about.vs.rowSawekLang"],
] as const;

const SECTIONS = [
  ["#who", "about.nav.who"],
  ["#how", "about.nav.how"],
  ["#pack", "about.nav.pack"],
  ["#compare", "about.nav.vs"],
  ["#tech", "about.nav.tech"],
  ["#pricing", "about.nav.pricing"],
  ["#faq", "about.nav.faq"],
] as const;

const FREE_ITEMS = ["pricing.f1", "pricing.f2", "pricing.f3", "pricing.f4", "pricing.f5"] as const;
const PRO_ITEMS = ["pricing.p1", "pricing.p2", "pricing.p3", "pricing.p4", "pricing.p5"] as const;

export function AboutPage() {
  const { t } = useI18n();

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

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pb-20 sm:pt-16">
          <p className="agency-kicker mb-4 text-center text-[#9FD4C8]">{t("about.kicker")}</p>
          <span className="agency-rule mx-auto mb-6 bg-[#9FD4C8]" />
          <h1
            className="agency-display-cream agency-fade-up mx-auto max-w-5xl text-center text-[2.35rem] leading-[1.1] sm:text-6xl lg:text-[4.2rem]"
            style={{ fontFamily: "var(--font-display-he), ui-serif, Georgia, serif" }}
          >
            {t("about.hero")}
          </h1>
          <p className="mobile-readable mx-auto mt-6 max-w-3xl text-center text-base font-semibold leading-relaxed text-[#E8E2D4] sm:mt-7 sm:text-xl">
            {t("about.heroLead")}
          </p>
          <p className="mx-auto mt-5 max-w-xl rounded-[12px] border border-white/12 bg-white/8 px-4 py-2.5 text-center text-sm font-bold text-[#F7F3EA] backdrop-blur-sm sm:px-5 sm:text-base">
            {t("home.vertex")}
          </p>

          <div className="mt-9 flex flex-col items-center gap-5 sm:mt-10">
            <div className="mobile-stack w-full justify-center">
              <Button asChild size="lg" variant="coral" className="btn-mobile-full text-base font-black sm:text-lg">
                <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
                  {t("about.ctaApp")}
                </LangLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-mobile-full border-white/20 bg-white/8 text-base font-black text-[#F7F3EA] hover:bg-white hover:text-ink sm:text-lg">
                <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
              </Button>
            </div>
            <p className="max-w-lg text-center text-sm font-semibold text-[#C9D0D8]">{t("about.ctaDemo")}</p>
            <DemoPicker tone="ink" />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-base leading-relaxed text-[#C9B896]">{t("about.truth")}</p>
        </div>
      </section>

      <nav aria-label={t("about.title")} className="relative z-10 mx-auto -mt-2 max-w-5xl px-4">
        <ul className="agency-board flex gap-1 overflow-x-auto p-2 sm:flex-wrap sm:justify-center sm:overflow-visible">
          {SECTIONS.map(([href, key]) => (
            <li key={href}>
              <a
                href={href}
                className="tap-target inline-flex shrink-0 items-center rounded-[10px] px-3 py-2 text-sm font-black text-navy hover:bg-teal/10 hover:text-teal"
              >
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="who" className="relative mx-auto mt-14 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.who.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <p className="mobile-readable mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-muted">{t("about.who.p")}</p>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WHO.map((item) => (
            <li key={item.key} className="agency-board flex min-h-[5.5rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center">
              <item.icon className="size-5 text-teal" aria-hidden />
              <span className="text-sm font-black leading-snug text-navy sm:text-base">{t(item.key)}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm font-semibold text-navy/70">{t("about.who.notOnly")}</p>
        <article className="agency-ink mt-8 rounded-[20px] p-6 text-start shadow-[var(--shadow-lift)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9FD4C8]">{t("about.demos.h")}</p>
          <p className="mt-3 text-base leading-relaxed text-[#E8E2D4] sm:text-lg">{t("about.demos.p")}</p>
        </article>
      </section>

      <section id="how" className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.how.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOW.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className={`agency-board p-5 text-start ${i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}`}>
                <p className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-teal sm:text-xs">
                  <span
                    className="inline-flex size-8 items-center justify-center rounded-[10px] text-white"
                    style={{ background: step.accent }}
                  >
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  {t("home.how.title")} · 0{i + 1}
                </p>
                <p className="agency-display mt-4 text-2xl">{t(step.title)}</p>
                <p className="mt-2 text-base leading-relaxed text-muted">{t(step.body)}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section id="pack" className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.pack.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted">{t("about.pack.lead")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PACK.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.title} className="agency-board p-6 text-start">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-teal">
                  <Icon className="size-4" aria-hidden />
                  {t(card.title)}
                </p>
                <p className="mt-3 text-base leading-relaxed text-navy/80">{t(card.body)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="compare" className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.vs.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <p className="mx-auto mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted">{t("about.vs.lead")}</p>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[20px] border border-[rgba(8,17,31,0.1)] bg-white p-6 text-start shadow-[var(--shadow-card)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">{t("about.vs.chatgptName")}</p>
            <p className="mt-3 text-base leading-relaxed text-navy/80">{t("about.vs.chatgpt")}</p>
          </article>
          <article className="rounded-[20px] border border-[rgba(8,17,31,0.1)] bg-white p-6 text-start shadow-[var(--shadow-card)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-muted">{t("about.vs.ordinaryName")}</p>
            <p className="mt-3 text-base leading-relaxed text-navy/80">{t("about.vs.ordinary")}</p>
          </article>
          <article className="agency-ink rounded-[20px] p-6 text-start shadow-[var(--shadow-lift)]">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9FD4C8]">{t("about.vs.sawekName")}</p>
            <p className="mt-3 text-base font-semibold leading-relaxed text-[#F7F3EA]">{t("about.vs.sawek")}</p>
          </article>
        </div>
        <div className="agency-board mt-6 overflow-x-auto p-0">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead>
              <tr className="border-b border-[rgba(8,17,31,0.08)] bg-[#08111F] text-[11px] font-black uppercase tracking-wide text-[#C9D0D8]">
                <th className="px-4 py-3.5" />
                <th className="px-4 py-3.5">{t("about.vs.chatgptName")}</th>
                <th className="px-4 py-3.5">{t("about.vs.ordinaryName")}</th>
                <th className="px-4 py-3.5 text-[#9FD4C8]">{t("about.vs.sawekName")}</th>
              </tr>
            </thead>
            <tbody className="text-navy">
              {VS_ROWS.map(([row, chat, ordinary, sawek]) => (
                <tr key={row} className="border-b border-[rgba(8,17,31,0.06)] last:border-0">
                  <td className="px-4 py-3.5 font-black">{t(row)}</td>
                  <td className="px-4 py-3.5 text-navy/65">{t(chat)}</td>
                  <td className="px-4 py-3.5 text-navy/65">{t(ordinary)}</td>
                  <td className="px-4 py-3.5 font-semibold">{t(sawek)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="tech" className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.tech.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <p className="mx-auto mt-6 max-w-3xl text-center text-lg leading-relaxed text-muted">{t("about.tech.lead")}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {TECH.map((card) => (
            <article key={card.h} className="agency-board border-s-[6px] border-s-teal p-6 text-start">
              <h3 className="agency-display text-2xl">{t(card.h)}</h3>
              <p className="mt-3 text-base leading-relaxed text-muted">{t(card.p)}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Button asChild variant="outline">
            <LangLink href="/status">{t("about.tech.status")}</LangLink>
          </Button>
        </div>
      </section>

      <section id="pricing" className="relative mx-auto mt-16 max-w-5xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("home.plans.title")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <article className="agency-board p-7 text-start">
            <p className="agency-kicker">{t("pricing.freeName")}</p>
            <p className="agency-display mt-3 text-5xl">{t("pricing.freePrice")}</p>
            <p className="text-sm text-muted">{t("pricing.freeForever")}</p>
            <ul className="mt-6 space-y-2.5 text-base text-navy">
              {FREE_ITEMS.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <Button asChild variant="outline" className="mt-6 w-full">
              <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
                {t("pricing.cta.free")}
              </LangLink>
            </Button>
          </article>
          <article className="agency-ink p-7 text-start shadow-[var(--shadow-lift)]">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#9FD4C8]">{t("pricing.proName")}</p>
            <p className="agency-display-cream mt-3 text-5xl">
              ₪{PRICE_MONTHLY_ILS}{" "}
              <span className="text-base font-bold text-[#C9D0D8]">{t("home.plans.month")}</span>
            </p>
            <p className="text-xl font-black text-[#F7F3EA]">
              ₪{PRICE_YEARLY_ILS} <span className="text-sm font-bold text-[#C9D0D8]">{t("home.plans.year")}</span>
            </p>
            <ul className="mt-6 space-y-2.5 text-base text-[#E8E2D4]">
              {PRO_ITEMS.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#E24B3A]" />
                  {t(k)}
                </li>
              ))}
            </ul>
            <Button asChild variant="coral" className="mt-6 w-full">
              <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
            </Button>
          </article>
        </div>
        <p className="mx-auto mt-5 max-w-2xl text-center text-sm font-semibold leading-relaxed text-navy/70">{t("about.pricing.note")}</p>
      </section>

      <section id="faq" className="relative mx-auto mt-16 max-w-3xl scroll-mt-24 px-4">
        <h2 className="agency-display text-center text-3xl sm:text-5xl">{t("about.faq.h")}</h2>
        <span className="agency-rule mx-auto mt-4" />
        <Accordion type="single" collapsible className="agency-board mt-8 px-5">
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}>
              <AccordionTrigger className="text-lg font-black">{t(q)}</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed text-muted">{t(a)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="relative mx-auto mt-16 max-w-5xl px-4 pb-20">
        <div className="agency-ink relative overflow-hidden rounded-[24px] px-6 py-12 text-center shadow-[var(--shadow-lift)] sm:px-10 sm:py-16">
          <div aria-hidden className="agency-grain absolute inset-0 opacity-20" />
          <div className="relative">
            <p className="agency-kicker text-[#9FD4C8]">{t("about.kicker")}</p>
            <h2 className="agency-display-cream mt-4 text-3xl sm:text-5xl">{t("about.end.h")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#C9D0D8] sm:text-lg">{t("about.end.p")}</p>
            <div className="mobile-stack mx-auto mt-8 w-full max-w-lg justify-center">
              <Button asChild size="lg" variant="coral" className="btn-mobile-full text-base font-black">
                <LangLink href="/" onClick={(e) => beginNewCampaign(e)}>
                  {t("about.ctaApp")}
                </LangLink>
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-mobile-full border-white/20 bg-white/8 text-base font-black text-[#F7F3EA] hover:bg-white hover:text-ink">
                <LangLink href="/pricing">{t("home.cta.pricing")}</LangLink>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

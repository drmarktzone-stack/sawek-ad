"use client";

import {
  CalendarDays,
  Clapperboard,
  Fingerprint,
  Images,
  Repeat2,
  Sparkles,
  TrendingUp,
  Gauge,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LangLink } from "@/components/lang-link";
import { cn } from "@/lib/utils";

/** Mohtawak-style content jobs (محتواك / dawrati.ai DNA) — not Mohtwa/mohtwa.ai. */
export const CONTENT_JOBS = [
  { id: "scripts", job: "scripts", title: "contentJobs.scripts", hint: "contentJobs.scriptsHint", icon: Clapperboard },
  { id: "hooks", job: "hooks", title: "contentJobs.hooks", hint: "contentJobs.hooksHint", icon: Sparkles },
  { id: "predict", job: "analyze", title: "contentJobs.predict", hint: "contentJobs.predictHint", icon: Gauge },
  { id: "rewrite", job: "remix", title: "contentJobs.rewrite", hint: "contentJobs.rewriteHint", icon: Repeat2 },
  { id: "carousel", job: "carousel", title: "contentJobs.carousel", hint: "contentJobs.carouselHint", icon: Images },
  { id: "calendar", job: "calendar", title: "contentJobs.calendar", hint: "contentJobs.calendarHint", icon: CalendarDays },
  { id: "trends", job: "trends", title: "contentJobs.trends", hint: "contentJobs.trendsHint", icon: TrendingUp },
  { id: "voice", job: "voice", title: "contentJobs.voice", hint: "contentJobs.voiceHint", icon: Fingerprint },
] as const;

export function ContentJobsStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <section
      className={cn("mb-6", compact && "mb-4")}
      data-testid="content-jobs"
      aria-label={t("contentJobs.title")}
    >
      <p className="os-kicker">{t("contentJobs.kicker")}</p>
      <h2 className="os-title mt-1 text-2xl sm:text-3xl">{t("contentJobs.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{t("contentJobs.lead")}</p>
      <ul className={cn("mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4", compact && "mt-3 gap-2")}>
        {CONTENT_JOBS.map((job) => {
          const Icon = job.icon;
          return (
            <li key={job.id}>
              <LangLink
                href={`/viral?job=${job.job}`}
                data-testid={`content-job-${job.id}`}
                className="tap-row flex h-full flex-col rounded-[20px] border border-[var(--line)] bg-white p-4 shadow-[var(--shadow-card)] hover:border-teal"
              >
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-mint text-teal">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="mt-3 text-base font-black text-navy">{t(job.title)}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted">{t(job.hint)}</span>
              </LangLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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

function JobCard({
  job,
}: {
  job: (typeof CONTENT_JOBS)[number];
}) {
  const { t } = useI18n();
  const Icon = job.icon;
  return (
    <LangLink
      href={`/viral?job=${job.job}`}
      data-testid={`content-job-${job.id}`}
      className="tap-row flex h-full min-h-[11.5rem] flex-col overflow-hidden rounded-[22px] border-2 border-[var(--ink)] bg-white p-4 shadow-[var(--shadow-card)] hover:border-teal"
    >
      <span className="inline-flex size-10 items-center justify-center rounded-[12px] bg-mint text-teal">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="mt-3 text-base font-black text-navy">{t(job.title)}</span>
      <span className="mt-1 mb-3 text-sm leading-relaxed text-muted">{t(job.hint)}</span>
      <span className="job-card-foot">{t(job.title)}</span>
    </LangLink>
  );
}

/** Three-up teaser on the dark hero — Mohtawak social-card energy, SAWEK jobs. */
export function ContentJobsFeatured() {
  const { t } = useI18n();
  return (
    <ul
      className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3"
      aria-label={t("contentJobs.title")}
    >
      {CONTENT_JOBS.slice(0, 3).map((job) => (
        <li key={job.id}>
          <JobCard job={job} />
        </li>
      ))}
    </ul>
  );
}

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
        {CONTENT_JOBS.map((job) => (
          <li key={job.id}>
            <JobCard job={job} />
          </li>
        ))}
      </ul>
    </section>
  );
}

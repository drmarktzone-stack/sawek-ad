"use client";

import { useEffect, useState } from "react";
import type { SelfPlan, SelfProfile } from "@/lib/types";
import { loadSelfPlans, loadSelfProfile, saveSelfPlans, saveSelfProfile } from "@/lib/storage";
import { weekPlan } from "@/lib/studio-engine";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { useIsClient } from "@/lib/use-is-client";

export function SelfMarketing() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const [profile, setProfile] = useState<SelfProfile>(() => ({
    name: "",
    craft: "",
    audience: "",
    cadence: "",
    channels: "",
    offer: "אין מבצע",
  }));
  const [plans, setPlans] = useState<SelfPlan[]>([]);
  const [hydrated, setHydrated] = useState(false);

  if (client && !hydrated) {
    const stored = loadSelfProfile();
    if (!stored.name.trim()) {
      const seeded: SelfProfile = {
        name: "ד״ר סאמר אבו מוך",
        craft: "מרפאת ילדים — כללית, באקה אל-גרביה",
        audience: "הורים בבאקה אל-גרביה והסביבה",
        cadence: "תוכנית שבועית — PLAN בלבד",
        channels: "WhatsApp 052-8885800 · https://drsamerped.ai.studio",
        offer: "אין מבצע",
      };
      saveSelfProfile(seeded);
      setProfile(seeded);
    } else {
      setProfile(stored);
    }
    setPlans(loadSelfPlans());
    setHydrated(true);
  }

  useEffect(() => {
    if (hydrated) saveSelfProfile(profile);
  }, [profile, hydrated]);

  function generate() {
    const plan = weekPlan(profile);
    const next = [plan, ...plans];
    setPlans(next);
    saveSelfPlans(next);
  }

  function toggle(planId: string, idx: number) {
    const next = plans.map((p) =>
      p.id !== planId
        ? p
        : { ...p, days: p.days.map((d, i) => (i === idx ? { ...d, done: !d.done } : d)) },
    );
    setPlans(next);
    saveSelfPlans(next);
  }

  const fields: { key: keyof SelfProfile; label: string }[] = [
    { key: "name", label: locale === "he" ? "שם" : locale === "ar" ? "الاسم" : "Name" },
    { key: "craft", label: locale === "he" ? "מה אתה מוכר / עושה" : locale === "ar" ? "ماذا تبيع / تفعل" : "What you sell / do" },
    { key: "audience", label: t("details.audience") },
    { key: "cadence", label: locale === "he" ? "קצב רצוי" : locale === "ar" ? "الإيقاع" : "Desired cadence" },
    { key: "channels", label: locale === "he" ? "ערוצים שיש בפועל" : locale === "ar" ? "قنوات موجودة فعلاً" : "Channels you actually have" },
    { key: "offer", label: t("details.offer") },
  ];

  const checklist =
    locale === "he"
      ? [
          "פרופיל מעודכן בלי הבטחות שווא",
          "CTA אחד ברור (תור / הודעה)",
          "אין מבצע מודבק אם אין מבצע",
          "תיעוד פניות אמיתיות השבוע",
        ]
      : locale === "ar"
        ? ["ملف محدّث بلا وعود كاذبة", "CTA واحد واضح", "لا عرض ملصق إن لم يوجد", "توثيق الطلبات الحقيقية هذا الأسبوع"]
        : [
            "Profile updated with no false claims",
            "One clear CTA (booking / message)",
            "No pasted promo if there is no offer",
            "Log of real enquiries this week",
          ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <ConquerHeadline subtitle={t("self.title")} />
      <p className="mb-6 text-center text-sm text-zinc-400">{t("self.lead")}</p>
      <DepartmentRail />

      <section className="rounded-2xl border border-white/10 bg-omni-card p-5 sm:p-8">
        {fields.map((f) => (
          <div key={f.key} className="mb-3">
            <Label>{f.label}</Label>
            {f.key === "craft" || f.key === "audience" ? (
              <Textarea
                value={profile[f.key]}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            ) : (
              <Input
                value={profile[f.key]}
                onChange={(e) => setProfile({ ...profile, [f.key]: e.target.value })}
              />
            )}
          </div>
        ))}
        <Button type="button" className="mt-2" onClick={generate} disabled={!profile.craft.trim()}>
          {locale === "he" ? "בנה תוכנית לשבוע" : locale === "ar" ? "ابنِ خطة لأسبوع" : "Build a 7-day plan"}
        </Button>
      </section>

      <section className="mt-8 rounded-2xl border border-white/10 bg-omni-card p-5">
        <h3 className="mb-3 font-black">
          {locale === "he" ? "צ׳קליסט שבועי" : locale === "ar" ? "قائمة أسبوعية" : "Weekly checklist"}
        </h3>
        <ul className="list-disc space-y-1 pe-5 text-sm text-zinc-300">
          {checklist.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      {plans.map((plan) => (
        <section key={plan.id} className="mt-6 rounded-2xl border border-white/10 bg-omni-card p-5">
          <p className="mb-3 text-xs text-zinc-500">{plan.createdAt.slice(0, 10)}</p>
          <ul className="space-y-2">
            {plan.days.map((d, i) => (
              <li key={i}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-3">
                  <input
                    type="checkbox"
                    checked={d.done}
                    onChange={() => toggle(plan.id, i)}
                    className="mt-1 accent-[#f5c518]"
                  />
                  <span>
                    <strong className="text-omni-yellow">{d.day[locale]}</strong>
                    <span className="block text-sm text-zinc-300">{d.task[locale]}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

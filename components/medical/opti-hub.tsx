"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/types";
import { filled, parseNumber } from "@/lib/utils";
import { toComplete } from "@/lib/medical/markers";
import {
  AD_TEMPLATES,
  BOTTLENECKS,
  CLINIC_TYPES,
  EVENTS,
  ENGINE_SPECIALTIES,
  HMOS,
  INDUSTRIES,
  MIXES,
  OLD_METHODS,
  OPTI_MODULES,
  PLATFORMS,
  SECTORS,
  SIGNAL_TEMPLATES,
  TEMPLATE_OBJECTIVES,
  acquisitionPlan,
  buildImagePrompt,
  buildOffers,
  computeFatigue,
  dualAds,
  emergencyCreative,
  hijackFramework,
  noShowRate,
  pick,
  reviewTarget,
  roasScenarios,
  runAudit,
  scanCompliance,
  simulateBuyers,
  socialProofCaption,
  trendHooks,
  voiceCampaign,
  type OptiModuleId,
} from "@/lib/medical/opti-engines";
import { EMPTY_DESK, type OptiDeskState } from "@/lib/medical/opti-state";
import { loadClinic, loadOptiDesk, saveOptiDesk } from "@/lib/medical/storage";
import { startPediatricDemoFlow } from "@/lib/start-pediatric-demo";
import { useI18n } from "@/components/i18n-provider";
import { useIsClient } from "@/lib/use-is-client";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ConquerHeadline } from "@/components/stepper";
import { DepartmentRail } from "@/components/department-shell";
import { MedicalNav } from "@/components/medical/medical-nav";
import { EthicsBanner } from "@/components/medical/ethics-banner";
import { cn } from "@/lib/utils";

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn("rounded-2xl border border-white/10 bg-omni-card p-5", className)}>{children}</section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-center">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black text-omni-yellow">{value}</p>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  const color = value < 35 ? "bg-emerald-400" : value < 65 ? "bg-omni-yellow" : "bg-omni-red";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: string; text: string }[];
}) {
  return (
    <div>
      {label ? <Label>{label}</Label> : null}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-omni-yellow/70"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-black">
            {o.text}
          </option>
        ))}
      </select>
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? "✓" : label}
    </Button>
  );
}

function isModule(id: string | null): id is OptiModuleId {
  return OPTI_MODULES.some((m) => m.id === id);
}

export function OptiHub() {
  const { locale, t } = useI18n();
  const client = useIsClient();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [desk, setDesk] = useState<OptiDeskState>({ ...EMPTY_DESK });
  const [booted, setBooted] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const [listening, setListening] = useState(false);

  if (client && !booted) {
    setDesk(loadOptiDesk());
    setBooted(true);
  }

  const q = params.get("m");
  const moduleId: OptiModuleId = isModule(q) ? q : desk.module;

  function patch(p: Partial<OptiDeskState>) {
    const next = { ...desk, ...p };
    setDesk(next);
    saveOptiDesk(next);
  }

  function go(id: OptiModuleId) {
    patch({ module: id });
    router.replace(`${pathname}?m=${id}`);
  }

  function loadDemo() {
    startPediatricDemoFlow();
  }

  const loc = locale as Locale;
  const clinic = client ? loadClinic() : null;
  const isHmo = desk.sector === "medical" && desk.clinicType === "hmo";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <ConquerHeadline subtitle={t("med.nav.opti")} />
      <p className="mx-auto mb-4 max-w-2xl text-center text-sm text-zinc-400">{t("med.opti.lead")}</p>
      <DepartmentRail />
      <MedicalNav />
      <EthicsBanner locale={loc} />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          data-demo="pediatric"
          className="relative z-20 h-auto max-w-full whitespace-normal py-2 text-start"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            loadDemo();
          }}
        >
          {t("med.demo")}
        </Button>
        <SelectField
          value={desk.industry}
          onChange={(v) => patch({ industry: v })}
          options={INDUSTRIES.map((i) => ({ id: i.id, text: pick(i.label, loc) }))}
        />
      </div>
      <p className="mt-3 text-xs text-zinc-500">{t("med.opti.sourceNote")}</p>

      <nav className="mt-6 flex flex-wrap gap-1">
        {OPTI_MODULES.map((m) => {
          const active = moduleId === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => go(m.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                active ? "bg-omni-yellow text-black" : "border border-white/10 text-zinc-300 hover:border-omni-yellow/40",
              )}
            >
              {pick(m.label, loc)}
            </button>
          );
        })}
      </nav>

      <div className="mt-6">
        {moduleId === "audit" && <AuditPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "clinic" && <ClinicPanel desk={desk} patch={patch} loc={loc} isHmo={isHmo} />}
        {moduleId === "simulator" && <SimPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "hijacker" && <HijackPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "radar" && <RadarPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "offers" && <OffersPanel desk={desk} patch={patch} loc={loc} isHmo={isHmo} />}
        {moduleId === "trends" && <TrendsPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "noshow" && <NoShowPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "compliance" && <CompliancePanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "reviews" && <ReviewsPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "roas" && <RoasPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "voice" && (
          <VoicePanel
            desk={desk}
            patch={patch}
            loc={loc}
            listening={listening}
            toggle={() => {
              if (listening) {
                recRef.current?.stop();
                setListening(false);
                return;
              }
              const w = window as unknown as {
                SpeechRecognition?: new () => SpeechRec;
                webkitSpeechRecognition?: new () => SpeechRec;
              };
              const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
              if (!Ctor) {
                patch({});
                return;
              }
              const rec = new Ctor();
              rec.lang = loc === "he" ? "he-IL" : loc === "ar" ? "ar-SA" : "en-US";
              rec.continuous = true;
              rec.interimResults = false;
              rec.onresult = (e) => {
                let text = "";
                for (let i = 0; i < e.results.length; i++) text += `${e.results[i]?.[0]?.transcript ?? ""} `;
                patch({ transcript: text.trim() });
              };
              rec.onerror = () => setListening(false);
              rec.onend = () => setListening(false);
              recRef.current = rec;
              rec.start();
              setListening(true);
            }}
          />
        )}
        {moduleId === "dual" && <DualPanel desk={desk} patch={patch} loc={loc} />}
        {moduleId === "studio" && <StudioPanel desk={desk} patch={patch} loc={loc} isHmo={isHmo} clinicName={clinic?.name} />}
        {moduleId === "templates" && <TemplatesPanel desk={desk} patch={patch} loc={loc} />}
      </div>
    </div>
  );
}

type Panel = { desk: OptiDeskState; patch: (p: Partial<OptiDeskState>) => void; loc: Locale };

function AuditPanel({ desk, patch, loc }: Panel) {
  const result = useMemo(
    () => runAudit({ methods: desk.methods, bottleneck: desk.bottleneck, budget: desk.budget }),
    [desk.methods, desk.bottleneck, desk.budget],
  );
  function toggle(id: string) {
    patch({ methods: desk.methods.includes(id) ? desk.methods.filter((x) => x !== id) : [...desk.methods, id] });
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-bold text-zinc-200">{pick({ he: "מה ניסיתם עד היום", ar: "ماذا جرّبتم حتى اليوم", en: "What you already tried" }, loc)}</p>
          <div className="flex flex-wrap gap-2">
            {OLD_METHODS.map((m) => {
              const on = desk.methods.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs",
                    on ? "bg-omni-red/20 text-red-200 ring-1 ring-omni-red/50" : "border border-white/10 text-zinc-400",
                  )}
                >
                  {pick(m.label, loc)}
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            <SelectField
              label={pick({ he: "צוואר בקבוק", ar: "عنق الزجاجة", en: "Bottleneck" }, loc)}
              value={desk.bottleneck}
              onChange={(v) => patch({ bottleneck: v })}
              options={[{ id: "", text: "—" }, ...BOTTLENECKS.map((b) => ({ id: b.id, text: pick(b.label, loc) }))]}
            />
          </div>
          <div className="mt-3">
            <Label>{pick({ he: "תקציב חודשי שסיפקתם (₪)", ar: "ميزانية شهرية أعطيتموها", en: "Monthly budget you supplied (₪)" }, loc)}</Label>
            <Input value={desk.budget} onChange={(e) => patch({ budget: e.target.value })} placeholder={toComplete(loc, loc === "he" ? "תקציב" : loc === "ar" ? "ميزانية" : "budget")} />
          </div>
        </Card>
        <Card>
          <p className="text-sm text-zinc-500">{pick({ he: "מד בריאות שיווקית (מקנסות שסימנתם)", ar: "مؤشر الصحة (من الغرامات التي علّمتموها)", en: "Marketing-health score (from penalties you ticked)" }, loc)}</p>
          <p className="text-6xl font-black text-omni-yellow">{result.score == null ? "—" : `${result.score}%`}</p>
          <p className="mt-3 text-sm text-zinc-300">{pick(result.verdict, loc)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat
              label={pick({ he: "פניות בתרחיש (לא תחזית)", ar: "استفسارات سيناريو (ليست توقّعاً)", en: "Scenario enquiries (not a forecast)" }, loc)}
              value={result.expectedLeads == null ? "—" : String(result.expectedLeads)}
            />
            <Stat label={pick({ he: "פערים", ar: "ثغرات", en: "Gaps" }, loc)} value={String(result.gaps.length)} />
          </div>
          <p className="mt-3 text-xs text-zinc-500">{pick(result.note, loc)}</p>
        </Card>
      </div>
      <Card>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">
          {pick({ he: "למה השיטה הישנה נכשלה", ar: "لماذا فشل الأسلوب القديم", en: "Why the old method failed" }, loc)}
        </h3>
        {result.gaps.length === 0 ? (
          <p className="text-sm text-zinc-500">{pick({ he: "סמנו שיטות. בלי סימון אין כרטיסים.", ar: "علّموا أساليب. بلا تعليم لا بطاقات.", en: "Tick methods. No ticks, no cards." }, loc)}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {result.gaps.map((g) => (
              <article key={pick(g.title, "en")} className="rounded-xl border border-omni-red/30 bg-omni-red/5 p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="font-bold text-red-100">{pick(g.title, loc)}</p>
                  <span className="rounded-full bg-omni-red/20 px-2 py-0.5 text-[11px] text-red-200">{pick(g.severity, loc)}</span>
                </div>
                <p className="text-sm text-zinc-300">{pick(g.body, loc)}</p>
                <p className="mt-2 text-[11px] text-zinc-500">{g.source}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">
            {pick({ he: "תוכנית חילוץ", ar: "خطة الإنقاذ", en: "Rescue plan" }, loc)}
          </h3>
          <ol className="space-y-3">
            {result.rescue.map((r, i) => (
              <li key={i} className="rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-zinc-100">
                    {i + 1}. {pick(r.step, loc)}
                  </p>
                  <span className="rounded-full bg-omni-yellow/15 px-2 py-0.5 text-[11px] text-omni-yellow">{pick(r.window, loc)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{pick(r.detail, loc)}</p>
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">
            {pick({ he: "מסלול 6 חודשים מהקלטים", ar: "مسار 6 أشهر من المدخلات", en: "6-month path from your inputs" }, loc)}
          </h3>
          {!result.growth ? (
            <p className="text-sm text-zinc-500">{toComplete(loc, loc === "he" ? "תקציב לתרחיש" : loc === "ar" ? "ميزانية للسيناريو" : "budget for the scenario")}</p>
          ) : (
            <ul className="space-y-2">
              {result.growth.map((g) => {
                const max = Math.max(...result.growth!.map((x) => Math.max(x.current, x.projected)), 1);
                return (
                  <li key={pick(g.month, "en")}>
                    <div className="mb-1 flex justify-between text-xs text-zinc-500">
                      <span>{pick(g.month, loc)}</span>
                      <span>
                        {g.current} → {g.projected}
                      </span>
                    </div>
                    <div className="flex h-2 gap-1">
                      <div className="h-full rounded-full bg-white/20" style={{ width: `${(g.current / max) * 100}%` }} />
                      <div className="h-full rounded-full bg-omni-yellow" style={{ width: `${(g.projected / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function ClinicPanel({ desk, patch, loc, isHmo }: Panel & { isHmo: boolean }) {
  const plan = useMemo(
    () =>
      acquisitionPlan({
        currentPatients: desk.currentPatients,
        targetMonth1: desk.targetMonth1,
        targetMonth2: desk.targetMonth2,
        budget: desk.budget,
        closeRate: desk.closeRate,
        cpl: desk.cpl,
      }),
    [desk],
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <SelectField
          label={pick({ he: "מגזר", ar: "القطاع", en: "Sector" }, loc)}
          value={desk.sector}
          onChange={(v) => patch({ sector: v })}
          options={SECTORS.map((s) => ({ id: s.id, text: pick(s.label, loc) }))}
        />
        {desk.sector === "medical" && (
          <>
            <SelectField
              label={pick({ he: "סוג מרפאה", ar: "نوع العيادة", en: "Clinic type" }, loc)}
              value={desk.clinicType}
              onChange={(v) => patch({ clinicType: v })}
              options={CLINIC_TYPES.map((s) => ({ id: s.id, text: pick(s.label, loc) }))}
            />
            {isHmo && (
              <SelectField
                label={pick({ he: "קופת חולים", ar: "صندوق المرضى", en: "HMO" }, loc)}
                value={desk.hmo}
                onChange={(v) => patch({ hmo: v })}
                options={[{ id: "", text: "—" }, ...HMOS.map((h) => ({ id: h.id, text: pick(h.label, loc) }))]}
              />
            )}
            <SelectField
              label={pick({ he: "התמחות מנוע", ar: "تخصص المحرك", en: "Engine specialty" }, loc)}
              value={desk.engineSpecialty}
              onChange={(v) => patch({ engineSpecialty: v })}
              options={ENGINE_SPECIALTIES.map((s) => ({ id: s.id, text: pick(s.label, loc) }))}
            />
          </>
        )}
        <div>
          <Label>{pick({ he: "עיר / אזור", ar: "مدينة / منطقة", en: "City / area" }, loc)}</Label>
          <Input value={desk.city} onChange={(e) => patch({ city: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>{pick({ he: "מטופלים עכשיו", ar: "المرضى الآن", en: "Patients now" }, loc)}</Label>
            <Input value={desk.currentPatients} onChange={(e) => patch({ currentPatients: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "יעד +חודש", ar: "هدف +شهر", en: "Target +1 mo" }, loc)}</Label>
            <Input value={desk.targetMonth1} onChange={(e) => patch({ targetMonth1: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "יעד +חודשיים", ar: "هدف +شهرين", en: "Target +2 mo" }, loc)}</Label>
            <Input value={desk.targetMonth2} onChange={(e) => patch({ targetMonth2: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>{pick({ he: "תקציב ₪", ar: "ميزانية", en: "Budget ₪" }, loc)}</Label>
            <Input value={desk.budget} onChange={(e) => patch({ budget: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "% סגירה שמדדתם", ar: "% إغلاق قستموه", en: "Measured close %" }, loc)}</Label>
            <Input value={desk.closeRate} onChange={(e) => patch({ closeRate: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "CPL שמדדתם ₪", ar: "CPL قستموه", en: "Measured CPL ₪" }, loc)}</Label>
            <Input value={desk.cpl} onChange={(e) => patch({ cpl: e.target.value })} />
          </div>
        </div>
        <p className={cn("rounded-xl border p-3 text-sm", isHmo ? "border-omni-yellow/40 text-omni-yellow" : "border-white/10 text-zinc-300")}>
          {isHmo
            ? pick(
                {
                  he: "מצב קופה: בלי מחיר והנחה במודעה. זמינות, ניסיון, קרבה, מכשור, מעקב.",
                  ar: "وضع الصندوق: بلا سعر وخصم. توفّر، خبرة، قرب، أجهزة، متابعة.",
                  en: "HMO mode: no price or discount in ads. Availability, experience, proximity, equipment, follow-up.",
                },
                loc,
              )
            : pick(
                {
                  he: "מרפאה פרטית: מותר מחיר אם סיפקתם. בלי המצאת הנחה.",
                  ar: "عيادة خاصة: السعر مسموح إن أعطيتموه. بلا اختراع خصم.",
                  en: "Private clinic: price allowed if you supplied it. Do not invent a discount.",
                },
                loc,
              )}
        </p>
      </Card>
      <Card>
        <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-omni-yellow">
          {pick({ he: "חשבון רכישה מהקלטים", ar: "حساب الاكتساب من المدخلات", en: "Acquisition math from your inputs" }, loc)}
        </h3>
        {!plan ? (
          <p className="text-sm text-zinc-500">
            {toComplete(loc, loc === "he" ? "מטופלים + יעד + % סגירה + CPL" : loc === "ar" ? "مرضى + هدف + % إغلاق + CPL" : "patients + target + close % + CPL")}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Stat label={pick({ he: "פער חודש 1", ar: "فجوة الشهر 1", en: "Month-1 gap" }, loc)} value={String(plan.gap1)} />
            <Stat label={pick({ he: "פניות נדרשות", ar: "استفسارات مطلوبة", en: "Enquiries needed" }, loc)} value={String(plan.leads1)} />
            <Stat label={pick({ he: "הוצאה נדרשת ₪", ar: "إنفاق مطلوب", en: "Spend needed ₪" }, loc)} value={String(plan.spend1)} />
            <Stat label={pick({ he: "ליום ₪", ar: "يومياً", en: "Per day ₪" }, loc)} value={String(plan.dailySpend1)} />
            <Stat label={pick({ he: "מודעות/שבוע", ar: "إعلانات/أسبوع", en: "Ads / week" }, loc)} value={String(plan.weeklyAds)} />
            <Stat label={pick({ he: "רמת תוקפנות", ar: "مستوى الهجومية", en: "Aggressiveness" }, loc)} value={pick(plan.aggressiveness, loc)} />
          </div>
        )}
        {plan?.budgetGap != null && plan.budgetGap > 0 ? (
          <p className="mt-3 rounded-xl border border-omni-red/40 bg-omni-red/10 p-3 text-sm text-red-200">
            {pick(
              {
                he: `חסרים ${plan.budgetGap} ₪ בתקציב שהוזן מול היעד — או מעלים תקציב או מורידים יעד או משפרים סגירה שנמדדה.`,
                ar: `تنقص ${plan.budgetGap} ₪ في الميزانية المُدخلة مقابل الهدف.`,
                en: `${plan.budgetGap} ₪ missing in the entered budget vs the target — raise budget, lower the target, or improve a measured close rate.`,
              },
              loc,
            )}
          </p>
        ) : null}
      </Card>
    </div>
  );
}

function SimPanel({ desk, patch, loc }: Panel) {
  const sim = useMemo(() => simulateBuyers({ copy: desk.adCopy, price: desk.simPrice, audience: desk.audience }), [desk.adCopy, desk.simPrice, desk.audience]);
  return (
    <div className="space-y-4">
      <Card>
        <Label>{pick({ he: "הדביקו טקסט מודעה", ar: "الصقوا نص الإعلان", en: "Paste ad copy" }, loc)}</Label>
        <Textarea value={desk.adCopy} onChange={(e) => patch({ adCopy: e.target.value })} className="min-h-32" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input value={desk.simPrice} onChange={(e) => patch({ simPrice: e.target.value })} placeholder={pick({ he: "מחיר שפורסם", ar: "السعر المعلن", en: "Stated price" }, loc)} />
          <Input value={desk.audience} onChange={(e) => patch({ audience: e.target.value })} placeholder={pick({ he: "קהל", ar: "الجمهور", en: "Audience" }, loc)} />
        </div>
      </Card>
      {!filled(desk.adCopy) ? (
        <p className="text-sm text-zinc-500">{toComplete(loc, loc === "he" ? "טקסט לבדיקה" : loc === "ar" ? "نص للفحص" : "copy to test")}</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {sim.personas.map((p) => (
              <Card key={p.id}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {p.emoji} {pick(p.name, loc)}
                    </p>
                    <p className="text-xs text-zinc-500">{pick(p.role, loc)}</p>
                  </div>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px]">{pick(p.verdict, loc)}</span>
                </div>
                <div className="mb-1 flex justify-between text-xs text-zinc-500">
                  <span>{pick({ he: "חיכוך", ar: "احتكاك", en: "Friction" }, loc)}</span>
                  <span>{p.friction}%</span>
                </div>
                <Meter value={p.friction} />
                <p className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm">«{pick(p.objection, loc)}»</p>
                <p className="mt-2 text-sm text-omni-yellow">{pick(p.fix, loc)}</p>
              </Card>
            ))}
          </div>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-omni-yellow">
                {pick({ he: "שכתוב שובר התנגדות", ar: "إعادة صياغة كاسحة للاعتراض", en: "Objection-breaking rewrite" }, loc)} · {sim.resistance}%
              </h3>
              <CopyBtn text={pick(sim.rewrite, loc)} label={pick({ he: "העתק", ar: "نسخ", en: "Copy" }, loc)} />
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{pick(sim.rewrite, loc)}</pre>
          </Card>
        </>
      )}
    </div>
  );
}

function HijackPanel({ desk, patch, loc }: Panel) {
  const hijack = useMemo(
    () => hijackFramework(desk.industry, desk.signalConfirmed ? desk.competitorSignal : ""),
    [desk.industry, desk.signalConfirmed, desk.competitorSignal],
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <p className="mb-2 text-sm font-bold">{pick({ he: "תבניות אות — לא פיד חי", ar: "قوالب إشارة — ليست بثاً حياً", en: "Signal templates — not a live feed" }, loc)}</p>
        <p className="mb-3 text-xs text-zinc-500">
          {pick(
            {
              he: "סמנו רק מה שראיתם בפועל. SAWEK AD לא סורק מתחרים.",
              ar: "علّموا فقط ما رأيتموه فعلاً. SAWEK AD لا يمسح المنافسين.",
              en: "Tick only what you actually saw. SAWEK AD does not scrape competitors.",
            },
            loc,
          )}
        </p>
        <div className="space-y-2">
          {SIGNAL_TEMPLATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => patch({ competitorSignal: pick(s.label, loc), signalConfirmed: false })}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-start text-sm",
                desk.competitorSignal === pick(s.label, loc) ? "border-omni-yellow text-omni-yellow" : "border-white/10 text-zinc-300",
              )}
            >
              {pick(s.label, loc)}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label>{pick({ he: "אות שצפיתם (במילים שלכם)", ar: "الإشارة التي رأيتموها (بكلماتكم)", en: "Signal you observed (your words)" }, loc)}</Label>
          <Textarea value={desk.competitorSignal} onChange={(e) => patch({ competitorSignal: e.target.value, signalConfirmed: false })} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={desk.signalConfirmed}
            onChange={(e) => patch({ signalConfirmed: e.target.checked })}
            className="accent-[#ffe500]"
          />
          {pick({ he: "אני מאשר/ת שזה מה שראיתי, לא המצאה", ar: "أؤكّد أن هذا ما رأيته، لا اختلاق", en: "I confirm this is what I saw, not invented" }, loc)}
        </label>
      </Card>
      <Card>
        {!desk.signalConfirmed || !filled(desk.competitorSignal) ? (
          <p className="py-12 text-center text-sm text-zinc-500">{pick(hijack.title, loc)}</p>
        ) : (
          <>
            <h3 className="text-sm font-black uppercase tracking-wide text-omni-yellow">{pick(hijack.title, loc)}</h3>
            <p className="mt-2 text-sm text-zinc-400">{hijack.signal}</p>
            <ol className="mt-4 space-y-3">
              {hijack.steps.map((s) => (
                <li key={pick(s.t, "en")} className="rounded-xl border border-white/10 p-3">
                  <p className="text-sm font-bold text-omni-yellow">{pick(s.t, loc)}</p>
                  <p className="mt-1 text-sm text-zinc-300">{pick(s.d, loc)}</p>
                </li>
              ))}
            </ol>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-4 text-sm">{pick(hijack.ad, loc)}</pre>
          </>
        )}
      </Card>
    </div>
  );
}

function RadarPanel({ desk, patch, loc }: Panel) {
  const fatigue = useMemo(
    () => computeFatigue({ ctr: desk.ctr, cpcStart: desk.cpcStart, cpcNow: desk.cpcNow, days: desk.days }),
    [desk.ctr, desk.cpcStart, desk.cpcNow, desk.days],
  );
  const creative = emergencyCreative(desk.industry, fatigue.score, loc);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>CTR %</Label>
            <Input value={desk.ctr} onChange={(e) => patch({ ctr: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "ימי הרצה", ar: "أيام التشغيل", en: "Days running" }, loc)}</Label>
            <Input value={desk.days} onChange={(e) => patch({ days: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "CPC בהתחלה ₪", ar: "CPC عند الإطلاق", en: "CPC at start ₪" }, loc)}</Label>
            <Input value={desk.cpcStart} onChange={(e) => patch({ cpcStart: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "CPC עכשיו ₪", ar: "CPC الآن", en: "CPC now ₪" }, loc)}</Label>
            <Input value={desk.cpcNow} onChange={(e) => patch({ cpcNow: e.target.value })} />
          </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm">
            <span>{pick({ he: "מד רוויה", ar: "مؤشر التشبع", en: "Saturation index" }, loc)}</span>
            <span className="text-omni-yellow">
              {fatigue.score == null ? "—" : `${fatigue.score}%`} — {pick(fatigue.state, loc)}
            </span>
          </div>
          {fatigue.score != null && <Meter value={fatigue.score} />}
          {fatigue.cpcRise != null && (
            <p className="mt-2 text-xs text-zinc-500">
              {pick({ he: "עליית CPC", ar: "ارتفاع CPC", en: "CPC rise" }, loc)}: {fatigue.cpcRise}%
            </p>
          )}
        </div>
      </Card>
      <Card>
        <h3 className="text-sm font-black uppercase tracking-wide text-omni-yellow">{pick(creative.headline, loc)}</h3>
        <p className="mt-2 text-xs text-zinc-500">{pick(creative.action, loc)}</p>
        <div className="mt-4 space-y-3">
          {creative.angles.map((a) => (
            <div key={pick(a.name, "en")} className="rounded-xl border border-white/10 p-3">
              <p className="text-xs text-omni-yellow">{pick(a.name, loc)}</p>
              <p className="mt-1 text-sm font-semibold">{pick(a.hook, loc)}</p>
              <p className="mt-1 text-xs text-zinc-500">{pick(a.body, loc)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OffersPanel({ desk, patch, loc, isHmo }: Panel & { isHmo: boolean }) {
  const data = useMemo(
    () =>
      buildOffers({
        product: desk.product,
        cost: desk.unitCost,
        price: desk.offerPrice,
        benefit: desk.benefit,
        hmo: isHmo,
      }),
    [desk.product, desk.unitCost, desk.offerPrice, desk.benefit, isHmo],
  );
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 md:grid-cols-4">
        <Input value={desk.product} onChange={(e) => patch({ product: e.target.value })} placeholder={pick({ he: "שירות", ar: "الخدمة", en: "Service" }, loc)} />
        <Input value={desk.benefit} onChange={(e) => patch({ benefit: e.target.value })} placeholder={pick({ he: "תוצאה רצויה", ar: "النتيجة المطلوبة", en: "Desired result" }, loc)} />
        <Input value={desk.unitCost} onChange={(e) => patch({ unitCost: e.target.value })} placeholder={pick({ he: "עלות יחידה ₪", ar: "تكلفة الوحدة", en: "Unit cost ₪" }, loc)} />
        <Input value={desk.offerPrice} onChange={(e) => patch({ offerPrice: e.target.value })} placeholder={pick({ he: "מחיר נוכחי ₪", ar: "السعر الحالي", en: "Current price ₪" }, loc)} />
      </Card>
      <p className="text-xs text-zinc-500">{pick(data.note, loc)}</p>
      {data.offers.length === 0 ? null : (
        <div className="grid gap-3 lg:grid-cols-3">
          {data.offers.map((o) => (
            <Card key={o.key}>
              <p className="text-lg font-black">{pick(o.title, loc)}</p>
              <p className="mt-1 text-3xl font-black text-omni-yellow">{o.newPrice} ₪</p>
              <p className="text-xs text-zinc-500">
                {pick({ he: "מרווח מתוכנן", ar: "هامش مخطّط", en: "Planned margin" }, loc)} {o.newMargin} ₪ · +{o.uplift}%
              </p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {o.bullets.map((b) => (
                  <li key={pick(b, "en")}>• {pick(b, loc)}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      {data.margin != null && (
        <Card>
          <div className="mb-2 flex justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide text-omni-yellow">{pick({ he: "סקריפט מכירה", ar: "سكربت البيع", en: "Sales script" }, loc)}</h3>
            <CopyBtn text={pick(data.script, loc)} label={pick({ he: "העתק", ar: "نسخ", en: "Copy" }, loc)} />
          </div>
          <pre className="whitespace-pre-wrap text-sm text-zinc-300">{pick(data.script, loc)}</pre>
        </Card>
      )}
    </div>
  );
}

function TrendsPanel({ desk, patch, loc }: Panel) {
  const data = useMemo(
    () => trendHooks(desk.eventId, desk.trendCity || desk.city, desk.industry, desk.eventConfirmed),
    [desk.eventId, desk.trendCity, desk.city, desk.industry, desk.eventConfirmed],
  );
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <SelectField
          label={pick({ he: "אירוע שאתם מאשרים", ar: "حدث تؤكّدونه", en: "Event you confirm" }, loc)}
          value={desk.eventId}
          onChange={(v) => patch({ eventId: v, eventConfirmed: false })}
          options={[{ id: "", text: "—" }, ...EVENTS.map((e) => ({ id: e.id, text: pick(e.label, loc) }))]}
        />
        <div>
          <Label>{pick({ he: "עיר להוק", ar: "مدينة للخطاف", en: "City for the hook" }, loc)}</Label>
          <Input value={desk.trendCity} onChange={(e) => patch({ trendCity: e.target.value })} placeholder={desk.city} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={desk.eventConfirmed} onChange={(e) => patch({ eventConfirmed: e.target.checked })} className="accent-[#ffe500]" />
          {pick({ he: "האירוע רלוונטי אצלנו השבוע", ar: "الحدث مناسب لدينا هذا الأسبوع", en: "This event is relevant for us this week" }, loc)}
        </label>
      </Card>
      <Card>
        <p className="text-xs text-zinc-500">{pick(data.note, loc)}</p>
        <ul className="mt-4 space-y-3">
          {data.hooks.map((h) => (
            <li key={pick(h, "en")} className="rounded-xl border border-white/10 p-3 text-sm">
              {pick(h, loc)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function NoShowPanel({ desk, patch, loc }: Panel) {
  const rate = noShowRate(desk.monthlyBookings, desk.noShows);
  const bookings = parseNumber(desk.monthlyBookings);
  const nos = parseNumber(desk.noShows);
  const cold = parseNumber(desk.coldLeads);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>{pick({ he: "תורים/חודש שמדדתם", ar: "حجوزات/شهر قستموها", en: "Bookings/month you measured" }, loc)}</Label>
            <Input value={desk.monthlyBookings} onChange={(e) => patch({ monthlyBookings: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "אי-הגעות", ar: "حالات التغيب", en: "No-shows" }, loc)}</Label>
            <Input value={desk.noShows} onChange={(e) => patch({ noShows: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "לידים קרים", ar: "عملاء باردون", en: "Cold leads" }, loc)}</Label>
            <Input value={desk.coldLeads} onChange={(e) => patch({ coldLeads: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>{pick({ he: "ערוץ", ar: "القناة", en: "Channel" }, loc)}</Label>
          <Input value={desk.channel} onChange={(e) => patch({ channel: e.target.value })} placeholder="WhatsApp" />
        </div>
        <div>
          <Label>{pick({ he: "דפוס שראיתם", ar: "النمط الذي رأيتموه", en: "Pattern you observed" }, loc)}</Label>
          <Textarea value={desk.noshowNotes} onChange={(e) => patch({ noshowNotes: e.target.value })} />
        </div>
      </Card>
      <Card>
        <p className="text-sm text-zinc-500">{pick({ he: "% אי-הגעה מהקלטים", ar: "% التغيب من المدخلات", en: "No-show % from your inputs" }, loc)}</p>
        <p className="text-6xl font-black text-omni-red">{rate == null ? "—" : `${rate}%`}</p>
        {nos != null && cold != null ? (
          <p className="mt-3 text-sm text-zinc-300">
            {pick(
              {
                he: `${nos} תורים שאבדו + ${cold} לידים קרים = ${nos + cold} הזדמנויות בלי שקל מודעה נוסף. תזכורת wa.me היא תוכנית, לא שליחה חיה.`,
                ar: `${nos} مواعيد ضائعة + ${cold} عملاء باردين = ${nos + cold} فرص بلا شيكل إعلان إضافي.`,
                en: `${nos} lost slots + ${cold} cold leads = ${nos + cold} recovery chances with no extra ad shekel. wa.me reminder is a plan, not a live send.`,
              },
              loc,
            )}
          </p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">
            {toComplete(loc, loc === "he" ? "תורים + אי-הגעות" : loc === "ar" ? "حجوزات + تغيب" : "bookings + no-shows")}
          </p>
        )}
        {bookings != null && (
          <p className="mt-2 text-xs text-zinc-500">
            {pick({ he: "בסיס", ar: "الأساس", en: "Base" }, loc)}: {bookings}
          </p>
        )}
      </Card>
    </div>
  );
}

function CompliancePanel({ desk, patch, loc }: Panel) {
  const { flags, score } = scanCompliance(desk.complianceCopy);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <Label>{pick({ he: "טקסט לבדיקה לפני עלייה", ar: "نص للفحص قبل الإطلاق", en: "Copy to check before launch" }, loc)}</Label>
        <Textarea className="min-h-44" value={desk.complianceCopy} onChange={(e) => patch({ complianceCopy: e.target.value })} />
      </Card>
      <Card>
        <p className="text-sm text-zinc-500">{pick({ he: "ציון בדיקה מהירה", ar: "درجة الفحص السريع", en: "Quick-scan score" }, loc)}</p>
        <p className={cn("text-6xl font-black", score != null && score >= 80 ? "text-emerald-400" : "text-omni-red")}>
          {score == null ? "—" : `${score}%`}
        </p>
        <div className="mt-4 space-y-2">
          {!filled(desk.complianceCopy) ? (
            <p className="text-sm text-zinc-500">{toComplete(loc, loc === "he" ? "טקסט מודעה" : loc === "ar" ? "نص إعلان" : "ad copy")}</p>
          ) : flags.length === 0 ? (
            <p className="text-sm text-emerald-300">
              {pick({ he: "אין ביטויים מסוכנים בסריקה המהירה — עדיין באנר אתיקה.", ar: "لا عبارات خطرة في الفحص السريع — الشريط الأخلاقي باقٍ.", en: "No risky phrases in the quick scan — the ethics banner stays." }, loc)}
            </p>
          ) : (
            flags.map((f) => (
              <p key={f} className="rounded-lg border border-omni-red/40 bg-omni-red/10 px-3 py-2 text-sm text-red-200">
                {pick({ he: "ביטוי מסוכן", ar: "عبارة خطرة", en: "Risky phrase" }, loc)}: «{f}»
              </p>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function ReviewsPanel({ desk, patch, loc }: Panel) {
  const tgt = reviewTarget(desk.reviewCount, desk.monthlyPatients);
  const caption = socialProofCaption(desk.reviewQuote, desk.reviewAuthor, parseNumber(desk.rating) ?? 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>{pick({ he: "דירוג שנמדד", ar: "تقييم مقيس", en: "Measured rating" }, loc)}</Label>
              <Input value={desk.rating} onChange={(e) => patch({ rating: e.target.value })} />
            </div>
            <div>
              <Label>{pick({ he: "מספר ביקורות", ar: "عدد المراجعات", en: "Review count" }, loc)}</Label>
              <Input value={desk.reviewCount} onChange={(e) => patch({ reviewCount: e.target.value })} />
            </div>
            <div>
              <Label>{pick({ he: "מטופלים/חודש", ar: "مرضى/شهر", en: "Patients/month" }, loc)}</Label>
              <Input value={desk.monthlyPatients} onChange={(e) => patch({ monthlyPatients: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{pick({ he: "תלונה חוזרת ששמעתם", ar: "شكوى متكررة سمعتموها", en: "Recurring complaint you heard" }, loc)}</Label>
            <Textarea value={desk.topComplaint} onChange={(e) => patch({ topComplaint: e.target.value })} />
          </div>
          <div>
            <Label>{pick({ he: "ציטוט עם הסכמה", ar: "اقتباس بموافقة", en: "Quote with consent" }, loc)}</Label>
            <Textarea value={desk.reviewQuote} onChange={(e) => patch({ reviewQuote: e.target.value })} />
          </div>
          <Input value={desk.reviewAuthor} onChange={(e) => patch({ reviewAuthor: e.target.value })} placeholder={pick({ he: "שם הממליץ", ar: "اسم صاحب المراجعة", en: "Reviewer name" }, loc)} />
        </Card>
        <Card>
          <p className="text-6xl font-black text-omni-yellow">
            {parseNumber(desk.rating) == null ? "—" : parseNumber(desk.rating)!.toFixed(1)}
            <span className="text-2xl text-zinc-500"> / 5</span>
          </p>
          {tgt ? (
            <p className="mt-3 text-sm text-zinc-300">
              {pick(
                {
                  he: `${tgt.monthly} מטופלים/חודש מול ${tgt.count} ביקורות. יעד תכנון: +${tgt.target} ביקורות החודש ממטופלים אמיתיים — בלי תמריץ כספי (מדיניות Google).`,
                  ar: `${tgt.monthly} مريضاً/شهر مقابل ${tgt.count} مراجعة. هدف تخطيط: +${tgt.target} هذا الشهر من مرضى حقيقيين — بلا حافز مالي.`,
                  en: `${tgt.monthly} patients/month vs ${tgt.count} reviews. Planning target: +${tgt.target} this month from real patients — no paid incentive (Google policy).`,
                },
                loc,
              )}
            </p>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">{toComplete(loc, loc === "he" ? "דירוג + ספירה + מטופלים" : loc === "ar" ? "تقييم + عدد + مرضى" : "rating + count + patients")}</p>
          )}
          <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-sm">{pick(caption, loc)}</pre>
        </Card>
      </div>
    </div>
  );
}

function RoasPanel({ desk, patch, loc }: Panel) {
  const scenarios = useMemo(
    () =>
      roasScenarios({
        budget: desk.budget,
        cpm: desk.cpm,
        ctr: desk.ctr,
        lpRate: desk.lpRate,
        closeRate: desk.roasClose,
        value: desk.customerValue,
      }),
    [desk.budget, desk.cpm, desk.ctr, desk.lpRate, desk.roasClose, desk.customerValue],
  );
  const rows = scenarios
    ? [
        { name: pick({ he: "שמרני", ar: "متحفظ", en: "Conservative" }, loc), s: scenarios.conservative },
        { name: pick({ he: "ריאלי", ar: "واقعي", en: "Realistic" }, loc), s: scenarios.realistic },
        { name: pick({ he: "אופטימי", ar: "متفائل", en: "Optimistic" }, loc), s: scenarios.optimistic },
      ]
    : [];
  const maxRev = Math.max(...rows.map((r) => r.s.revenue), 1);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="grid grid-cols-2 gap-3">
        <div>
          <Label>{pick({ he: "תקציב ₪", ar: "ميزانية", en: "Budget ₪" }, loc)}</Label>
          <Input value={desk.budget} onChange={(e) => patch({ budget: e.target.value })} />
        </div>
        <div>
          <Label>CPM ₪</Label>
          <Input value={desk.cpm} onChange={(e) => patch({ cpm: e.target.value })} />
        </div>
        <div>
          <Label>CTR %</Label>
          <Input value={desk.ctr} onChange={(e) => patch({ ctr: e.target.value })} />
        </div>
        <div>
          <Label>{pick({ he: "המרת נחיתה %", ar: "تحويل الهبوط %", en: "Landing conversion %" }, loc)}</Label>
          <Input value={desk.lpRate} onChange={(e) => patch({ lpRate: e.target.value })} />
        </div>
        <div>
          <Label>{pick({ he: "סגירת פניות %", ar: "إغلاق الاستفسارات %", en: "Enquiry close %" }, loc)}</Label>
          <Input value={desk.roasClose} onChange={(e) => patch({ roasClose: e.target.value })} />
        </div>
        <div>
          <Label>{pick({ he: "ערך לקוח ₪", ar: "قيمة العميل", en: "Customer value ₪" }, loc)}</Label>
          <Input value={desk.customerValue} onChange={(e) => patch({ customerValue: e.target.value })} />
        </div>
      </Card>
      <Card>
        {!scenarios ? (
          <p className="text-sm text-zinc-500">{toComplete(loc, "budget + CPM + CTR + LP% + close% + value")}</p>
        ) : (
          <>
            <p className="mb-4 text-xs text-zinc-500">{pick(scenarios.note, loc)}</p>
            {rows.map((r) => (
              <div key={r.name} className="mb-3">
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-bold">{r.name}</span>
                  <span className="text-zinc-400">
                    {r.s.leads} · CPL {r.s.cpl} · ROAS {r.s.roas}x
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-omni-yellow" style={{ width: `${(r.s.revenue / maxRev) * 100}%` }} />
                </div>
              </div>
            ))}
          </>
        )}
      </Card>
    </div>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function VoicePanel({
  desk,
  patch,
  loc,
  listening,
  toggle,
}: Panel & { listening: boolean; toggle: () => void }) {
  const pack = voiceCampaign(desk.transcript, desk.voiceChannel);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="space-y-3">
        <Label>{pick({ he: "רעיון קולי או כתוב", ar: "فكرة صوتية أو مكتوبة", en: "Voice idea or typed note" }, loc)}</Label>
        <Textarea className="min-h-44" value={desk.transcript} onChange={(e) => patch({ transcript: e.target.value })} />
        <SelectField
          label={pick({ he: "ערוץ (תוכנית)", ar: "القناة (خطة)", en: "Channel (plan)" }, loc)}
          value={desk.voiceChannel}
          onChange={(v) => patch({ voiceChannel: v })}
          options={[
            { id: "all", text: pick({ he: "הכל", ar: "الكل", en: "All" }, loc) },
            { id: "meta", text: "Meta + WhatsApp" },
            { id: "google", text: "Google" },
          ]}
        />
        <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-sm">{pick(pack, loc)}</pre>
      </Card>
      <Card className="flex flex-col items-center justify-center gap-4 text-center">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-28 w-28 items-center justify-center rounded-full border text-sm font-bold",
            listening ? "border-omni-red bg-omni-red/20 text-red-100" : "border-omni-yellow bg-omni-yellow/15 text-omni-yellow",
          )}
        >
          {listening ? pick({ he: "עצור", ar: "إيقاف", en: "Stop" }, loc) : pick({ he: "דבר/י", ar: "تكلّم", en: "Speak" }, loc)}
        </button>
        <p className="text-xs text-zinc-500">
          {pick(
            {
              he: "התמלול בדפדפן. אם אין תמיכה — כתבו. בלי המצאת עובדות רפואיות מההקלטה.",
              ar: "التفريغ في المتصفح. إن لم يُدعم — اكتبوا. بلا اختراع حقائق طبية من التسجيل.",
              en: "Transcription stays in the browser. If unsupported — type. No invented medical facts from the recording.",
            },
            loc,
          )}
        </p>
      </Card>
    </div>
  );
}

function DualPanel({ desk, patch, loc }: Panel) {
  const ads = dualAds(desk.coreMessage, desk.audienceMix, desk.platform, desk.region);
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <Label>{pick({ he: "מסר ליבה / הצעה", ar: "الرسالة الأساسية / العرض", en: "Core message / offer" }, loc)}</Label>
        <Textarea value={desk.coreMessage} onChange={(e) => patch({ coreMessage: e.target.value })} />
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label={pick({ he: "תמהיל קהל", ar: "تركيبة الجمهور", en: "Audience mix" }, loc)}
            value={desk.audienceMix}
            onChange={(v) => patch({ audienceMix: v })}
            options={MIXES.map((m) => ({ id: m.id, text: pick(m.label, loc) }))}
          />
          <SelectField
            label={pick({ he: "פלטפורמה", ar: "المنصة", en: "Platform" }, loc)}
            value={desk.platform}
            onChange={(v) => patch({ platform: v })}
            options={PLATFORMS.map((m) => ({ id: m.id, text: pick(m.label, loc) }))}
          />
          <div>
            <Label>{pick({ he: "אזור", ar: "المنطقة", en: "Region" }, loc)}</Label>
            <Input value={desk.region} onChange={(e) => patch({ region: e.target.value })} />
          </div>
        </div>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        {(["he", "ar", "en"] as Locale[]).map((l) => (
          <Card key={l}>
            <div className="mb-2 flex justify-between">
              <p className="text-xs font-black uppercase text-omni-yellow">{l}</p>
              <CopyBtn text={ads[l]} label={pick({ he: "העתק", ar: "نسخ", en: "Copy" }, loc)} />
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300" dir={l === "en" ? "ltr" : "rtl"}>
              {ads[l]}
            </pre>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StudioPanel({ desk, patch, loc, isHmo, clinicName }: Panel & { isHmo: boolean; clinicName?: string }) {
  const prompt = useMemo(
    () => buildImagePrompt(desk.imageKind, { specialty: desk.engineSpecialty, city: desk.city, subject: desk.subject }),
    [desk.imageKind, desk.engineSpecialty, desk.city, desk.subject],
  );
  const hmo = HMOS.find((h) => h.id === desk.hmo);
  const pos: Record<string, string> = { tr: "top-4 end-4", tl: "top-4 start-4", br: "bottom-4 end-4", bl: "bottom-4 start-4" };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <Label>{pick({ he: "הוק", ar: "الخطاف", en: "Hook" }, loc)}</Label>
          <Textarea value={desk.hook} onChange={(e) => patch({ hook: e.target.value })} />
          <SelectField
            label={pick({ he: "מיקום תג", ar: "موقع الشارة", en: "Badge position" }, loc)}
            value={desk.badgePos}
            onChange={(v) => patch({ badgePos: v })}
            options={[
              { id: "tr", text: pick({ he: "למעלה בתחילת השורה", ar: "أعلى البداية", en: "Top start" }, loc) },
              { id: "tl", text: pick({ he: "למעלה בסוף", ar: "أعلى النهاية", en: "Top end" }, loc) },
              { id: "br", text: pick({ he: "למטה בתחילת", ar: "أسفل البداية", en: "Bottom start" }, loc) },
              { id: "bl", text: pick({ he: "למטה בסוף", ar: "أسفل النهاية", en: "Bottom end" }, loc) },
            ]}
          />
        </Card>
        <Card>
          <p className="mb-3 text-sm font-bold">{pick({ he: "תצוגת מודעה", ar: "معاينة الإعلان", en: "Ad preview" }, loc)}</p>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 via-black to-zinc-950 ring-1 ring-white/10">
            {isHmo && hmo ? (
              <span
                className={cn("absolute rounded-xl px-3 py-1.5 text-xs font-black text-black", pos[desk.badgePos])}
                style={{ background: hmo.color }}
              >
                {pick(hmo.label, loc)}
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="text-3xl font-black leading-tight text-white drop-shadow-lg">
                {filled(desk.hook) ? desk.hook : toComplete(loc, loc === "he" ? "הוק" : loc === "ar" ? "خطاف" : "hook")}
              </p>
              <p className="mt-2 text-sm text-omni-yellow">
                {filled(desk.city) ? desk.city : clinicName ?? toComplete(loc, loc === "he" ? "עיר" : loc === "ar" ? "مدينة" : "city")}
              </p>
            </div>
            <div className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-white/20" />
          </div>
        </Card>
      </div>
      <Card>
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label={pick({ he: "סוג תמונה", ar: "نوع الصورة", en: "Image kind" }, loc)}
            value={desk.imageKind}
            onChange={(v) => patch({ imageKind: v })}
            options={[
              { id: "pain", text: pick({ he: "כאב / בעיה", ar: "ألم / مشكلة", en: "Pain / problem" }, loc) },
              { id: "transformation", text: pick({ he: "לפני/אחרי (רק עם הסכמה)", ar: "قبل/بعد (بموافقة)", en: "Before/after (consent only)" }, loc) },
              { id: "hero", text: pick({ he: "הירו סטודיו", ar: "هيرو استوديو", en: "Studio hero" }, loc) },
            ]}
          />
          <div>
            <Label>{pick({ he: "נושא", ar: "الموضوع", en: "Subject" }, loc)}</Label>
            <Input value={desk.subject} onChange={(e) => patch({ subject: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <pre className="flex-1 whitespace-pre-wrap text-sm text-zinc-300" dir="ltr">
            {prompt}
          </pre>
          <CopyBtn text={prompt} label={pick({ he: "העתק", ar: "نسخ", en: "Copy" }, loc)} />
        </div>
      </Card>
    </div>
  );
}

function TemplatesPanel({ desk, patch, loc }: Panel) {
  const list = AD_TEMPLATES.filter(
    (t) => (!desk.templateSector || t.sector === desk.templateSector) && (!desk.templateObjective || t.objective === desk.templateObjective),
  );
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={pick({ he: "מגזר", ar: "القطاع", en: "Sector" }, loc)}
          value={desk.templateSector}
          onChange={(v) => patch({ templateSector: v })}
          options={SECTORS.map((s) => ({ id: s.id, text: pick(s.label, loc) }))}
        />
        <SelectField
          label={pick({ he: "מטרה", ar: "الهدف", en: "Objective" }, loc)}
          value={desk.templateObjective}
          onChange={(v) => patch({ templateObjective: v })}
          options={TEMPLATE_OBJECTIVES.map((s) => ({ id: s.id, text: pick(s.label, loc) }))}
        />
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((t) => (
          <Card key={t.id}>
            <p className="text-xs text-zinc-500">
              {t.ratio} · {pick(t.layout, loc)}
            </p>
            <p className="mt-1 text-lg font-black">{pick(t.name, loc)}</p>
            <p className="mt-2 text-sm font-semibold text-omni-yellow">{pick(t.headline, loc)}</p>
            <p className="mt-1 text-sm text-zinc-300">{pick(t.body, loc)}</p>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-omni-red">{pick(t.cta, loc)}</p>
            <p className="mt-2 text-xs text-zinc-500">{pick(t.visual, loc)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

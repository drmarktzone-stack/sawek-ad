"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/types";
import type { MedicalCampaign, MedicalLead } from "@/lib/medical/types";
import { blockFor, waLink } from "@/lib/medical/generate";
import { skinOf } from "@/lib/medical/skins";
import { ETHICS } from "@/lib/medical/markers";
import { addLead } from "@/lib/medical/storage";
import { upcomingSlots } from "@/lib/medical/slots";
import { uid } from "@/lib/utils";
import { dirFor } from "@/lib/i18n";
import { loadDraft } from "@/lib/storage";
import { assetLabelText } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { isFreeService, sampleLabel } from "@/lib/operating-model";
import { useIsClient } from "@/lib/use-is-client";

export function LandingView({
  campaign,
  locale,
  onLead,
  publicMode = false,
}: {
  campaign: MedicalCampaign;
  locale: Locale;
  onLead?: (lead: MedicalLead) => void;
  publicMode?: boolean;
}) {
  const copy = blockFor(campaign, locale);
  const skin = skinOf(campaign.template);
  const clinic = campaign.clinic;
  const t = campaign.treatment;
  const dir = dirFor(locale);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [booked, setBooked] = useState("");
  const slots = useMemo(() => upcomingSlots(clinic, 8), [clinic]);
  const client = useIsClient();
  const draftAssets = client ? (loadDraft().intake.mediaAssets ?? []) : [];
  const urls = useResolvedAssets(draftAssets);
  const free = isFreeService(clinic) || (client && isFreeService(loadDraft().intake));

  const labels = {
    services: locale === "he" ? "השירות" : locale === "ar" ? "الخدمة" : "The service",
    faq: locale === "he" ? "שאלות" : locale === "ar" ? "أسئلة" : "FAQ",
    form: locale === "he" ? "השאירו פנייה" : locale === "ar" ? "اتركوا طلباً" : "Leave an enquiry",
    book: free
      ? (locale === "he" ? "הגיעו למרפאה" : locale === "ar" ? "جيبوه عالعيادة" : "Come to the clinic")
      : (locale === "he" ? "קביעת תור" : locale === "ar" ? "حجز موعد" : "Book a visit"),
    submit: locale === "he" ? "שליחה" : locale === "ar" ? "إرسال" : "Send",
    thanks: locale === "he" ? "הפנייה נשמרה במערכת ההדגמה (localStorage)." : locale === "ar" ? "حُفظ الطلب محلياً." : "Enquiry saved in the demo system (localStorage).",
    name: locale === "he" ? "שם מלא" : locale === "ar" ? "الاسم الكامل" : "Full name",
    phone: locale === "he" ? "טלפון" : locale === "ar" ? "هاتف" : "Phone",
    msg: locale === "he" ? "הערה" : locale === "ar" ? "ملاحظة" : "Note",
    ba: locale === "he" ? "לפני / אחרי" : locale === "ar" ? "قبل / بعد" : "Before / after",
    baSkip:
      locale === "he"
        ? "מדור לפני/אחרי מוסתר — אין הסכמת מטופל בקליטה."
        : locale === "ar"
          ? "قسم قبل/بعد مخفي — لا موافقة مريض في البيانات."
          : "Before/after section omitted — no patient consent in intake.",
    disc: locale === "he" ? "דיסקליימר" : locale === "ar" ? "إخلاء" : "Disclaimer",
    wa: locale === "he" ? "וואטסאפ" : locale === "ar" ? "واتساب" : "WhatsApp",
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const lead: MedicalLead = {
      id: uid("lead"),
      campaignId: campaign.id,
      slug: campaign.slug,
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      status: "new",
      createdAt: new Date().toISOString(),
    };
    addLead(lead);
    onLead?.(lead);
    setSent(true);
  }

  const wa = waLink(clinic.whatsapp, copy.whatsappScript);

  return (
    <div
      dir={dir}
      lang={locale}
      className={skin.serif ? "font-serif" : ""}
      style={{ background: skin.bg, color: skin.ink, minHeight: publicMode ? "100vh" : undefined }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: skin.accent }}>
          {clinic.doctorName} · {clinic.city}
        </p>
        <header
          className="mt-4 rounded-3xl p-8"
          style={{ background: skin.hero, border: `1px solid ${skin.accent}33` }}
        >
          <h1 className="text-3xl font-black leading-tight sm:text-4xl">{copy.landingHeadline}</h1>
          <p className="mt-3 text-base leading-relaxed" style={{ color: skin.muted }}>
            {copy.landingSub}
          </p>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block rounded-full px-5 py-2 text-sm font-black"
              style={{ background: skin.accent, color: skin.ctaInk }}
            >
              {labels.wa}
            </a>
          )}
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          {draftAssets.length === 0 ? (
            <div
              className="flex h-40 items-center justify-center rounded-2xl text-xs font-black uppercase tracking-[0.18em]"
              style={{ background: skin.card, color: skin.muted }}
            >
              {sampleLabel(locale)}
            </div>
          ) : (
            draftAssets.map((a) => (
              <figure key={a.id} className="overflow-hidden rounded-2xl" style={{ background: skin.card }}>
                {urls[a.id] && a.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[a.id]} alt={assetLabelText(a.label, locale)} className="h-40 w-full object-cover" />
                ) : urls[a.id] && a.kind === "video" ? (
                  <video src={urls[a.id]} className="h-40 w-full object-cover" muted playsInline controls />
                ) : (
                  <div className="flex h-40 items-center justify-center text-[10px] font-black uppercase tracking-widest" style={{ color: skin.muted }}>
                    {sampleLabel(locale)}
                  </div>
                )}
                <figcaption className="px-3 py-2 text-xs" style={{ color: skin.muted }}>
                  {assetLabelText(a.label, locale)}
                  {a.note ? ` — ${a.note}` : ""}
                </figcaption>
              </figure>
            ))
          )}
        </section>

        <div
          className="mt-6 rounded-xl px-4 py-3 text-sm"
          style={{ background: "#fee2e2", color: "#9f1239", border: "1px solid #fecaca" }}
        >
          {ETHICS[locale]}
        </div>

        <section className="mt-8 rounded-2xl p-6" style={{ background: skin.card }}>
          <h2 className="text-lg font-black">{labels.services}</h2>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed" style={{ color: skin.muted }}>
            {copy.servicesBlurb}
          </p>
        </section>

        <section className="mt-6 rounded-2xl p-6" style={{ background: skin.card }}>
          <h2 className="text-lg font-black">{labels.ba}</h2>
          {t.consentBeforeAfter && (t.beforeCaption || t.afterCaption) ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <p className="rounded-xl border p-4 text-sm" style={{ borderColor: `${skin.accent}44` }}>
                {t.beforeCaption || "—"}
              </p>
              <p className="rounded-xl border p-4 text-sm" style={{ borderColor: `${skin.accent}44` }}>
                {t.afterCaption || "—"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm" style={{ color: skin.muted }}>
              {labels.baSkip}
            </p>
          )}
        </section>

        <section className="mt-6 rounded-2xl p-6" style={{ background: skin.card }}>
          <h2 className="text-lg font-black">{labels.faq}</h2>
          <dl className="mt-3 space-y-3">
            {copy.faq.map((f) => (
              <div key={f.q}>
                <dt className="font-bold">{f.q}</dt>
                <dd className="mt-1 text-sm" style={{ color: skin.muted }}>
                  {f.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-6 rounded-2xl p-6" style={{ background: skin.card }}>
          <h2 className="text-lg font-black">{labels.form}</h2>
          {sent ? (
            <p className="mt-3 text-sm font-semibold">{labels.thanks}</p>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={submit}>
              <input
                required
                className="h-11 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: `${skin.accent}55`, background: skin.bg, color: skin.ink }}
                placeholder={labels.name}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                required
                className="h-11 w-full rounded-xl border px-3 text-sm"
                style={{ borderColor: `${skin.accent}55`, background: skin.bg, color: skin.ink }}
                placeholder={labels.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <textarea
                className="min-h-20 w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: `${skin.accent}55`, background: skin.bg, color: skin.ink }}
                placeholder={labels.msg}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="rounded-full px-5 py-2 text-sm font-black"
                style={{ background: skin.accent, color: skin.ctaInk }}
              >
                {labels.submit}
              </button>
            </form>
          )}
        </section>

        <section className="mt-6 rounded-2xl p-6" style={{ background: skin.card }}>
          <h2 className="text-lg font-black">{labels.book}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {slots.map((s) => (
              <li key={s.iso}>
                <button
                  type="button"
                  onClick={() => setBooked(s.iso)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: booked === s.iso ? skin.accent : "transparent",
                    color: booked === s.iso ? skin.ctaInk : skin.ink,
                    border: `1px solid ${skin.accent}66`,
                  }}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
          {booked && (
            <p className="mt-3 text-sm">
              {locale === "he"
                ? "המשבצת נבחרה בדף. להמרה לתור אמיתי — דלפק התורים ב-SAWEK AD (תוכנית, לא יומן חי)."
                : locale === "ar"
                  ? "اختير الموعد في الصفحة. التحويل لموعد يتم في SAWEK AD."
                  : "Slot selected on the page. Convert to an appointment on SAWEK AD’s desk (plan, not a live calendar)."}
            </p>
          )}
        </section>

        <footer className="mt-8 pb-10 text-xs leading-relaxed" style={{ color: skin.muted }}>
          <p className="font-bold">{labels.disc}</p>
          <p className="mt-2 whitespace-pre-wrap">{copy.disclaimer}</p>
        </footer>
      </div>
    </div>
  );
}

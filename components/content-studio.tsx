"use client";

import { useState } from "react";
import { generateStudioVariants } from "@/lib/studio-engine";
import { DESIGN_STYLES } from "@/lib/design-styles";
import { loadDraft, loadStudio, saveDraft, saveStudio } from "@/lib/storage";
import { produceAd } from "@/lib/engine/produce-ad";
import { emptyIntake } from "@/lib/engine/validate";
import { MediaAssetUploader } from "@/components/media-asset-uploader";
import { CampaignAdVisual } from "@/components/ad-mockup";
import type { Intake, Locale, MediaAssetMeta, StudioPiece } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { ConquerHeadline } from "@/components/stepper";
import { useIsClient } from "@/lib/use-is-client";

const KINDS: StudioPiece["kind"][] = ["post", "reel", "story", "email", "headline"];

export function ContentStudio({ embedded = false }: { embedded?: boolean }) {
  const { locale, t } = useI18n();
  const [kind, setKind] = useState<StudioPiece["kind"]>("post");
  const [idea, setIdea] = useState("");
  const [library, setLibrary] = useState<StudioPiece[]>([]);
  const [styleId, setStyleId] = useState(DESIGN_STYLES[0].id);
  const [mock, setMock] = useState<ReturnType<typeof produceAd> | null>(null);
  const [assets, setAssets] = useState<MediaAssetMeta[]>([]);
  const client = useIsClient();
  const [booted, setBooted] = useState(false);

  if (client && !booted) {
    setLibrary(loadStudio());
    setAssets(loadDraft().intake.mediaAssets ?? []);
    setBooted(true);
  }

  function generate() {
    const variants = generateStudioVariants(kind, idea, locale);
    const piece: StudioPiece = {
      id: uid("studio"),
      createdAt: new Date().toISOString(),
      kind,
      idea,
      locale,
      variants,
      styleId,
    };
    const next = [piece, ...library];
    setLibrary(next);
    saveStudio(next);
  }

  function currentIntake(): Intake {
    const intake = { ...emptyIntake(), ...loadDraft().intake, mediaAssets: assets };
    return intake;
  }

  function produce() {
    const intake = currentIntake();
    intake.businessName = intake.businessName || idea.slice(0, 40) || "Studio";
    intake.uniqueAdvantage = intake.uniqueAdvantage || idea;
    setMock(produceAd(intake, styleId, idea, locale));
  }

  const kindLabel: Record<StudioPiece["kind"], Record<Locale, string>> = {
    post: { he: "פוסט", ar: "منشور", en: "Post" },
    reel: { he: "ריל", ar: "ريل", en: "Reel" },
    story: { he: "סטורי", ar: "ستوري", en: "Story" },
    email: { he: "אימייל", ar: "بريد", en: "Email" },
    headline: { he: "כותרת", ar: "عنوان", en: "Headline" },
  };

  return (
    <div className={embedded ? "" : "mx-auto max-w-5xl px-4 py-10"}>
      {!embedded && (
        <>
          <ConquerHeadline subtitle={t("studio.title")} />
          <p className="mx-auto mb-8 max-w-xl text-center text-sm text-zinc-400">{t("studio.lead")}</p>
        </>
      )}
      {embedded && (
        <h2 className="mb-4 mt-8 text-lg font-black text-omni-yellow">{t("studio.title")}</h2>
      )}

      <div className="rounded-2xl border border-white/10 bg-omni-card p-5 sm:p-8">
        <div className="mb-4 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                kind === k ? "bg-omni-yellow text-black" : "bg-white/5 text-zinc-300"
              }`}
            >
              {kindLabel[k][locale]}
            </button>
          ))}
        </div>
        <Label>{t("design.idea")}</Label>
        <Textarea value={idea} onChange={(e) => setIdea(e.target.value)} className="mb-4" />
        <Button type="button" onClick={generate} disabled={!idea.trim()}>
          {t("cta.next")}
        </Button>
        {client && (
          <div className="mt-6">
            <MediaAssetUploader
              assets={assets}
              intake={currentIntake()}
              onChange={(mediaAssets) => {
                setAssets(mediaAssets);
                const d = loadDraft();
                saveDraft({ ...d, intake: { ...d.intake, mediaAssets } });
              }}
            />
          </div>
        )}
      </div>

      <h3 className="mb-3 mt-10 text-lg font-black">{t("design.title")}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {DESIGN_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStyleId(s.id)}
            className={`overflow-hidden rounded-xl border text-start ${
              styleId === s.id ? "border-omni-yellow" : "border-white/10"
            }`}
          >
            <div
              className="h-16"
              style={{ background: `linear-gradient(135deg, ${s.palette.join(",")})` }}
            />
            <p className="p-2 text-xs font-bold">{s.name[locale]}</p>
          </button>
        ))}
      </div>
      <Button type="button" className="mt-4" onClick={produce} disabled={!idea.trim()}>
        {t("design.make")}
      </Button>
      {mock && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <CampaignAdVisual
            locale={locale}
            palette={DESIGN_STYLES.find((s) => s.id === mock.styleId)?.palette ?? ["#111", "#333"]}
            assets={assets}
            index={0}
            className="min-h-40"
          >
            <h3 className="text-2xl font-black text-white">{mock.headline}</h3>
          </CampaignAdVisual>
          <p className="bg-omni-card p-4 text-sm text-zinc-300">{mock.body}</p>
        </div>
      )}

      <ul className="mt-10 space-y-4">
        {library.length === 0 && (
          <li className="text-center text-sm text-zinc-500">
            {locale === "he" ? "הספרייה ריקה." : locale === "ar" ? "المكتبة فارغة." : "Library is empty."}
          </li>
        )}
        {library.map((p) => (
          <li key={p.id} className="rounded-2xl border border-white/10 bg-omni-card p-4">
            <p className="text-xs text-omni-yellow">
              {kindLabel[p.kind][locale]} · {p.locale}
            </p>
            <p className="mt-1 font-semibold">{p.idea}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {p.variants.map((v, i) => (
                <div key={i} className="rounded-xl bg-black/30 p-3 text-sm">
                  <p className="text-xs text-zinc-500">{v.title}</p>
                  <p className="whitespace-pre-wrap text-zinc-200">{v.body}</p>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

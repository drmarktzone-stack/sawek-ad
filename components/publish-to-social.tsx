"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Share2 } from "lucide-react";
import type { CampaignPack, Locale } from "@/lib/types";
import type { SocialProvider, SocialStatusResponse } from "@/lib/social/types";
import { packHasLocalImage, packPublicImageUrl, publishMessage } from "@/lib/social/copy";
import { getAssetBlob } from "@/lib/media-assets";
import { getCampaign, getClientId } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { FacebookFeedCard } from "@/components/live-preview-cards";
import { channelFields } from "@/lib/channel-copy";
import { paletteForIntake } from "@/lib/brand-kit";
import { pickAsset, pickLogo } from "@/lib/media-assets";
import { useResolvedAssets } from "@/lib/use-resolved-assets";
import { graphicPostersForIntake } from "@/lib/graphic-posters";

const PROVIDERS: { id: SocialProvider; start: "facebook" | "linkedin"; labelKey: "social.facebook" | "social.instagram" | "social.linkedin" }[] = [
  { id: "facebook", start: "facebook", labelKey: "social.facebook" },
  { id: "instagram", start: "facebook", labelKey: "social.instagram" },
  { id: "linkedin", start: "linkedin", labelKey: "social.linkedin" },
];

type Props = {
  campaignId: string;
  pack?: CampaignPack;
  locale?: Locale;
  compact?: boolean;
  showConnect?: boolean;
};

const emptyStatus = (): SocialStatusResponse => ({
  facebook: { connected: false },
  instagram: { connected: false },
  linkedin: { connected: false },
  configured: { facebook: false, linkedin: false },
  needs_service_role: false,
});

export function SocialConnectStrip({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-navy/10 bg-white p-4", className)}>
      <PublishToSocial campaignId="" showConnect compact={false} />
    </div>
  );
}

export function PublishToSocial({ campaignId, pack: packProp, locale: localeProp, showConnect = true }: Props) {
  const { t, locale } = useI18n();
  const loc = localeProp ?? locale;
  const pack = packProp ?? (campaignId ? getCampaign(campaignId) : undefined);
  const [status, setStatus] = useState<SocialStatusResponse>(emptyStatus);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Record<SocialProvider, boolean>>({
    facebook: true,
    instagram: true,
    linkedin: true,
  });
  const [flash, setFlash] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ platform: string; ok: boolean; permalink?: string; error?: string }>>([]);

  const loadStatus = useCallback(async () => {
    try {
      const id = getClientId();
      const res = await fetch(`/api/social/status?clientId=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = (await res.json()) as SocialStatusResponse;
      setStatus({
        facebook: data.facebook ?? { connected: false },
        instagram: data.instagram ?? { connected: false },
        linkedin: data.linkedin ?? { connected: false },
        configured: data.configured ?? { facebook: false, linkedin: false },
        needs_service_role: Boolean(data.needs_service_role),
      });
    } catch {
      /* status is optional */
    }
  }, []);

  useEffect(() => {
    void loadStatus();
    const onVis = () => {
      if (document.visibilityState === "visible") void loadStatus();
    };
    const onFocus = () => { void loadStatus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [loadStatus]);

  const message = useMemo(() => (pack ? publishMessage(pack, loc) : ""), [pack, loc]);
  const publicImg = pack ? packPublicImageUrl(pack, typeof window !== "undefined" ? window.location.origin : "") : undefined;
  const hasImageHint = Boolean(publicImg) || Boolean(pack && packHasLocalImage(pack));

  function connect(start: "facebook" | "linkedin") {
    const configured = start === "facebook" ? status.configured.facebook : status.configured.linkedin;
    if (!configured) {
      setFlash(t("social.notConfigured"));
      return;
    }
    const id = getClientId();
    window.location.href = `/api/social/oauth/${start}/start?clientId=${encodeURIComponent(id)}`;
  }

  async function confirm() {
    if (!pack || !campaignId) return;
    const platforms = (Object.keys(picked) as SocialProvider[]).filter((p) => picked[p] && status[p].connected);
    if (!platforms.length) {
      setFlash(t("social.selectNetworks"));
      return;
    }
    if (!message.trim()) {
      setFlash(t("social.emptyMessage"));
      return;
    }
    setBusy(true);
    setFlash(null);
    setResults([]);
    try {
      const form = new FormData();
      form.set("clientId", getClientId());
      form.set("campaignId", campaignId);
      form.set("platforms", JSON.stringify(platforms));
      form.set("message", message);
      if (publicImg && /^https?:\/\//i.test(publicImg)) form.set("imageUrl", publicImg);
      else {
        const asset = (pack.intake.mediaAssets ?? []).find((a) => a.kind === "image");
        if (asset) {
          const blob = await getAssetBlob(asset.id);
          if (blob) {
            const file = new File([blob], asset.name || "image.jpg", { type: blob.type || "image/jpeg" });
            form.set("image", file);
          }
        }
      }
      const res = await fetch("/api/social/publish", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string; results?: typeof results };
      if (data.results) setResults(data.results);
      else if (data.error) setFlash(mapError(data.error, t));
    } catch {
      setFlash(t("social.error"));
    } finally {
      setBusy(false);
    }
  }

  const anyConfigured = status.configured.facebook || status.configured.linkedin;
  const showPublish = Boolean(pack && campaignId);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {showConnect && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[13px] font-bold uppercase tracking-wide text-muted">{t("social.networks")}</span>
          {PROVIDERS.map((p) => {
            const connected = status[p.id].connected;
            const cfg = p.start === "facebook" ? status.configured.facebook : status.configured.linkedin;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => (connected ? undefined : connect(p.start))}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[13px] font-semibold",
                  connected ? "bg-navy text-white" : "border border-navy/15 text-muted hover:border-gold",
                )}
                title={status[p.id].pageName ?? t(p.labelKey)}
              >
                {t(p.labelKey)} · {connected ? t("social.connected") : cfg ? t("social.connect") : t("social.connect")}
              </button>
            );
          })}
        </div>
      )}

      {!anyConfigured && (
        <p className="text-sm text-muted">{t("social.notConfigured")}</p>
      )}
      {status.needs_service_role && anyConfigured && (
        <p className="text-sm text-muted">{t("social.needsServiceRole")}</p>
      )}

      {showPublish && (
        <div>
          <Button type="button" size="sm" variant={open ? "dark" : "default"} onClick={() => setOpen((v) => !v)}>
            <Share2 className="size-3.5" />
            {t("social.publish")}
          </Button>
        </div>
      )}

      {open && showPublish && (
        <div className="mt-1 rounded-xl border border-navy/10 bg-background p-3 text-start">
          <p className="mb-2 text-[13px] font-bold uppercase tracking-wide text-muted">{t("social.selectNetworks")}</p>
          <div className="mb-3 flex flex-wrap gap-3">
            {PROVIDERS.map((p) => {
              const connected = status[p.id].connected;
              return (
                <label key={p.id} className="flex items-center gap-1.5 text-xs text-foreground">
                  <input
                    type="checkbox"
                    disabled={!connected}
                    checked={Boolean(picked[p.id] && connected)}
                    onChange={(e) => setPicked((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                  />
                  {t(p.labelKey)}
                  {!connected && <span className="text-muted">({t("social.notConnected")})</span>}
                </label>
              );
            })}
          </div>
          <p className="mb-1 text-[13px] font-bold uppercase tracking-wide text-muted">{t("social.preview")}</p>
          {pack ? <PublishExactMockup pack={pack} locale={loc} /> : null}
          <pre className="mb-2 mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-background p-2 text-sm leading-relaxed text-foreground">
            {message || t("social.emptyMessage")}
          </pre>
          {!hasImageHint && <p className="mb-2 text-sm text-muted">{t("social.noImage")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy || !message.trim()} onClick={() => void confirm()}>
              {busy ? t("social.publishing") : t("social.confirm")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              {t("social.cancel")}
            </Button>
          </div>
        </div>
      )}

      {flash && <p className="text-xs text-gold">{flash}</p>}
      {results.length > 0 && (
        <ul className="space-y-1 text-xs">
          {results.map((r) => (
            <li key={r.platform} className={r.ok ? "text-gold" : "text-muted"}>
              {r.platform}:{" "}
              {r.ok
                ? r.permalink
                  ? (
                    <a href={r.permalink} target="_blank" rel="noreferrer" className="underline">
                      {t("social.success")}
                    </a>
                    )
                  : t("social.success")
                : mapError(r.error ?? "publish_failed", t)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function mapError(code: string, t: (k: Parameters<typeof import("@/lib/i18n").t>[1]) => string): string {
  switch (code) {
    case "not_connected":
      return t("social.notConnected");
    case "instagram_needs_image":
      return t("social.instagramNeedsImage");
    case "empty_message":
      return t("social.emptyMessage");
    case "not_configured":
      return t("social.notConfigured");
    case "no_page":
      return t("social.noPage");
    default:
      return t("social.error");
  }
}

function PublishExactMockup({ pack, locale }: { pack: CampaignPack; locale: Locale }) {
  const { t } = useI18n();
  const fields = channelFields(pack, locale);
  const palette = paletteForIntake(pack.intake);
  const assets = pack.intake.mediaAssets ?? [];
  const urls = useResolvedAssets(assets);
  const logo = pickLogo(assets);
  const logoUrl = logo ? logo.publicSrc || urls[logo.id] : undefined;
  const fallback = !pickAsset(assets, 0) ? graphicPostersForIntake(pack.intake)[0]?.dataUrl : undefined;
  return (
    <FacebookFeedCard
      packLang={locale}
      fields={fields}
      asset={pickAsset(assets, 0)}
      urls={urls}
      logoUrl={logoUrl}
      palette={palette}
      generatedSrc={fallback}
      graphicOnlyLabel={undefined}
      sponsored={t("end.sponsored")}
      like={t("end.like")}
      comment={t("end.comment")}
      share={t("end.share")}
    />
  );
}


"use client";

import { useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Globe, Link2 } from "lucide-react";
import type { ClientBrandKit, IngestedDocument, IngestTag, MediaAssetMeta } from "@/lib/types";
import {
  applyIngestReview,
  rowsFromExtracted,
  type IngestFieldId,
  type IngestReviewRow,
} from "@/lib/document-ingest";
import { applyIntakeToDraft } from "@/lib/storage";
import { emptyIntake } from "@/lib/engine/validate";
import { clearPendingDemo } from "@/lib/demo";
import { clearEmptyCampaign } from "@/lib/empty-campaign";
import { uid } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { IngestReviewDialog } from "@/components/document-ingest";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { assetsFromPublicUrls } from "@/lib/media-assets";

type ErrorCode = "invalid_url" | "blocked" | "timeout" | "non_html" | "empty" | "too_large" | "network" | "social_login_wall";

const ERROR_KEY: Record<ErrorCode, "url.error.invalid" | "url.error.blocked" | "url.error.timeout" | "url.error.nonHtml" | "url.error.empty" | "url.error.tooLarge" | "url.error.network" | "url.error.socialLoginWall"> = {
  invalid_url: "url.error.invalid",
  blocked: "url.error.blocked",
  timeout: "url.error.timeout",
  non_html: "url.error.nonHtml",
  empty: "url.error.empty",
  too_large: "url.error.tooLarge",
  network: "url.error.network",
  social_login_wall: "url.error.socialLoginWall",
};

function isErrorCode(v: string): v is ErrorCode {
  return v in ERROR_KEY;
}

export function UrlIngest() {
  const { t } = useI18n();
  const pathname = usePathname();
  const home = pathname === "/";
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<IngestReviewRow[]>([]);
  const [doc, setDoc] = useState<IngestedDocument | null>(null);
  const [assets, setAssets] = useState<MediaAssetMeta[]>([]);
  const [brandKit, setBrandKit] = useState<ClientBrandKit>({ colors: [], source: "none" });
  const [posts, setPosts] = useState<{ id: string; text: string; image?: string; include: boolean }[]>([]);

  function patchRow(id: string, p: Partial<IngestReviewRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p, missing: !(p.value ?? r.value).trim() } : r)));
  }

  async function scan(e?: FormEvent) {
    e?.preventDefault();
    const url = value.trim();
    setError("");
    if (!url) {
      setError(t("url.error.invalid"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ingest-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        url?: string;
        title?: string;
        text?: string;
        fields?: Partial<Record<IngestFieldId, string>>;
        ogImage?: string;
        images?: string[];
        logo?: string;
        colors?: string[];
        jsonLdHits?: string[];
        posts?: { text?: string; image?: string }[];
        sourceKind?: string;
      };
      if (!data?.ok) {
        const code = typeof data?.error === "string" && isErrorCode(data.error) ? data.error : "network";
        setError(t(ERROR_KEY[code]));
        return;
      }
      const fields = data.fields ?? {};
      const nextRows = rowsFromExtracted(fields, false);
      const tags: IngestTag[] = [];
      const extractedPosts = Array.isArray(data.posts)
        ? data.posts
            .filter((p) => typeof p?.text === "string" && p.text.trim().length >= 8)
            .slice(0, 12)
            .map((p, i) => ({
              id: `post-${i}`,
              text: String(p.text).replace(/\s+/g, " ").trim(),
              ...(typeof p.image === "string" && /^https?:\/\//i.test(p.image) ? { image: p.image } : {}),
              include: true,
            }))
        : [];
      if (fields.pastHeadline || fields.pastBody || fields.pastCta || extractedPosts.length) tags.push("past_creative");
      if (fields.businessName || fields.whatsapp || fields.location) tags.push("identity");
      if (fields.brandTone || fields.brandPositioning || fields.uniqueAdvantage) tags.push("branding");
      if (fields.channelNotes) tags.push("media_plan");
      if (fields.whatsappTemplates || fields.landingLines) tags.push("leads");
      if (!tags.length) tags.push("other");
      const ingested: IngestedDocument = {
        id: uid("doc"),
        name: data.url || url,
        mime: "text/html",
        size: (data.text || "").length,
        kind: "url",
        tags,
        excerpt: (data.text || "").slice(0, 800),
        createdAt: new Date().toISOString(),
      };
      const imageUrls: string[] = [];
      const socialLogo = data.sourceKind === "facebook" || data.sourceKind === "instagram";
      const logoUrl = typeof data.logo === "string" && /^https?:\/\//i.test(data.logo)
        ? data.logo
        : socialLogo && typeof data.ogImage === "string"
          ? data.ogImage
          : "";
      for (const u of [logoUrl, ...(data.images ?? []), data.ogImage ?? ""]) {
        if (u && /^https?:\/\//i.test(u) && !imageUrls.includes(u)) imageUrls.push(u);
      }
      const extra: MediaAssetMeta[] = assetsFromPublicUrls(imageUrls, data.title, 16);
      const colors = Array.isArray((data as { colors?: unknown }).colors)
        ? ((data as { colors: unknown[] }).colors.filter((c): c is string => typeof c === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)))
        : [];
      const kit: ClientBrandKit = {
        ...(logoUrl && /^https?:\/\//i.test(logoUrl) ? { logoSrc: logoUrl } : extra.find((a) => a.label === "logo")?.publicSrc ? { logoSrc: extra.find((a) => a.label === "logo")!.publicSrc } : {}),
        colors: colors.slice(0, 5),
        source: colors.length || logoUrl ? "scan" : "none",
      };
      if (socialLogo && logoUrl) {
        const logoAsset = extra.find((a) => a.publicSrc === logoUrl);
        if (logoAsset) logoAsset.label = "logo";
      }
      setBrandKit(kit);
      setDoc(ingested);
      setAssets(extra);
      setRows(nextRows);
      setPosts(extractedPosts);
    } catch {
      setError(t("url.error.network"));
    } finally {
      setBusy(false);
    }
  }

  function confirm() {
    if (!doc) return;
    const selected = posts.filter((p) => p.include).map((p) => ({ text: p.text, image: p.image }));
    const next = applyIngestReview(emptyIntake(), rows, doc, assets, selected);
    next.brandKit = brandKit;
    applyIntakeToDraft(next, { resetWizard: true });
    clearPendingDemo();
    clearEmptyCampaign();
    setDoc(null);
    setRows([]);
    setAssets([]);
    setPosts([]);
    setBrandKit({ colors: [], source: "none" });
  }

  return (
    <div
      className={cn(
        "border-b border-omni-yellow/25 bg-black/90",
        home ? "px-3 py-3" : "px-3 py-1.5",
      )}
    >
      <form
        onSubmit={(e) => void scan(e)}
        className={cn(
          "mx-auto flex max-w-[92rem] flex-col gap-2 sm:flex-row sm:items-center",
          home ? "gap-2" : "gap-1.5",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Globe className={cn("shrink-0 text-omni-yellow", home ? "size-5" : "size-4")} />
          <input
            dir="ltr"
            className={cn(
              "w-full rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-omni-yellow/70",
              home ? "h-12" : "h-9 text-xs",
            )}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t("url.placeholder")}
            autoComplete="url"
            inputMode="url"
            name="business-url"
          />
        </div>
        <Button type="submit" size={home ? "default" : "sm"} disabled={busy} className="shrink-0">
          <Link2 className={home ? "size-4" : "size-3.5"} />
          {busy ? t("url.reading") : t("url.scan")}
        </Button>
      </form>
      <p className={cn("mx-auto max-w-[92rem] text-[11px] text-zinc-500", home ? "mt-1.5" : "mt-1 hidden sm:block")}>
        {t("url.hint")}
      </p>
      {error && <p className="mx-auto mt-1 max-w-[92rem] text-xs font-semibold text-omni-red">{error}</p>}

      <IngestReviewDialog
        open={Boolean(doc)}
        onOpenChange={(o) => {
          if (!o) {
            setDoc(null);
            setRows([]);
            setAssets([]);
            setPosts([]);
            setBrandKit({ colors: [], source: "none" });
          }
        }}
        sourceLabel={doc?.name ?? ""}
        rows={rows}
        patchRow={patchRow}
        onConfirm={confirm}
        showPastTag={doc?.tags.includes("past_creative")}
        posts={posts}
        onTogglePost={(id, include) => setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, include } : p)))}
      />
    </div>
  );
}

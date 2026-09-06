"use client";

import { useRef, useState, type ReactNode } from "react";
import { FileScan, ScanLine } from "lucide-react";
import type { Intake } from "@/lib/types";
import {
  applyIngestReview,
  classifyDocument,
  documentSizeError,
  ingestToComplete,
  INGEST_FIELD_META,
  prepareDocument,
  reextractFromTypedText,
  STAGE_LABEL,
  type IngestPrepareResult,
  type IngestReviewRow,
} from "@/lib/document-ingest";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";

export function IngestReviewDialog({
  open,
  onOpenChange,
  sourceLabel,
  rows,
  patchRow,
  onConfirm,
  extra,
  showPastTag,
  posts,
  onTogglePost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceLabel: string;
  rows: IngestReviewRow[];
  patchRow: (id: string, p: Partial<IngestReviewRow>) => void;
  onConfirm: () => void;
  extra?: ReactNode;
  showPastTag?: boolean;
  posts?: { id: string; text: string; image?: string; include: boolean }[];
  onTogglePost?: (id: string, include: boolean) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(94vw,820px)] max-h-[86vh] overflow-y-auto">
        <DialogTitle>{t("ingest.review")}</DialogTitle>
        <p className="mt-1 text-xs text-muted">
          {sourceLabel} · {t("ingest.noGuess")}
        </p>
        {extra}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-start text-sm">
            <thead className="text-sm uppercase tracking-wide text-muted">
              <tr>
                <th className="p-2">{t("ingest.include")}</th>
                <th className="p-2">{t("ingest.field")}</th>
                <th className="p-2">{t("ingest.value")}</th>
                <th className="p-2">{t("ingest.stage")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-navy/10 align-top">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={r.include}
                      aria-label={`${t("ingest.include")} ${INGEST_FIELD_META[r.field].label[locale]}`}
                      onChange={(e) => patchRow(r.id, { include: e.target.checked })}
                    />
                  </td>
                  <td className="p-2 text-muted">{INGEST_FIELD_META[r.field].label[locale]}</td>
                  <td className="p-2">
                    <input
                      className="h-9 w-full rounded-lg border border-navy/15 bg-background px-2 text-xs text-navy"
                      value={r.value}
                      aria-label={INGEST_FIELD_META[r.field].label[locale]}
                      placeholder={ingestToComplete(locale)}
                      onChange={(e) =>
                        patchRow(r.id, { value: e.target.value, include: Boolean(e.target.value.trim()) })
                      }
                    />
                    {r.missing && <p className="mt-1 text-sm text-muted">{ingestToComplete(locale)}</p>}
                    {r.needsClaimConfirm && (
                      <label className="mt-2 flex items-start gap-2 text-sm text-danger">
                        <input
                          type="checkbox"
                          checked={r.claimsAllowed}
                          onChange={(e) => patchRow(r.id, { claimsAllowed: e.target.checked })}
                        />
                        <span>{t("ingest.claimsAllow")}</span>
                      </label>
                    )}
                  </td>
                  <td className="p-2 text-xs text-gold">{STAGE_LABEL[r.targetStage][locale]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {posts && posts.length > 0 && (
          <div className="mt-4 rounded-xl border border-gold/25 bg-background p-3">
            <p className="text-xs font-black uppercase tracking-wide text-gold">{t("ingest.pastPosts")}</p>
            <ul className="mt-2 space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="flex items-start gap-2 rounded-lg border border-navy/10 px-2 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={p.include}
                    aria-label={t("ingest.pastPosts")}
                    onChange={(e) => onTogglePost?.(p.id, e.target.checked)}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">{p.text}</p>
                    {p.image ? <p className="mt-1 truncate text-sm text-muted" dir="ltr">{p.image}</p> : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {showPastTag && <p className="mt-3 text-xs text-muted">{t("ingest.pastTag")}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="button" onClick={onConfirm}>
            {t("ingest.apply")}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("review.cancel")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentIngest({
  intake,
  onApply,
  variant = "compact",
}: {
  intake: Intake;
  onApply: (next: Intake) => void;
  variant?: "primary" | "compact";
}) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [prep, setPrep] = useState<IngestPrepareResult | null>(null);
  const [rows, setRows] = useState<IngestReviewRow[]>([]);
  const [typed, setTyped] = useState("");

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setError("");
    const file = list[0];
    const classified = classifyDocument(file);
    if (classified.kind === null) {
      setError(documentSizeError(locale, classified.reason));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      const result = await prepareDocument(file);
      setPrep(result);
      setRows(result.rows);
      setTyped("");
    } catch (e) {
      const name = e instanceof Error ? e.name : "";
      setError(documentSizeError(locale, name === "DocSizeError" ? "size" : "type"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function patchRow(id: string, p: Partial<IngestReviewRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p, missing: !(p.value ?? r.value).trim() } : r)));
  }

  function useTyped() {
    if (!prep || !typed.trim()) return;
    setRows(reextractFromTypedText(typed, prep.doc.name, rows));
  }

  function confirm() {
    if (!prep) return;
    const next = applyIngestReview(intake, rows, prep.doc, prep.extraAssets);
    onApply(next);
    setPrep(null);
    setRows([]);
    setTyped("");
  }

  const trigger = (
    <>
      <input
        ref={inputRef}
        id="ingest-file"
        type="file"
        accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        aria-label={t("ingest.scan")}
        onChange={(e) => void onFiles(e.target.files)}
      />
      <Button
        type="button"
        variant={variant === "primary" ? "outline" : "dark"}
        size={variant === "primary" ? "default" : "sm"}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {variant === "primary" ? <FileScan className="size-4" /> : <ScanLine className="size-3.5" />}
        {busy ? t("ingest.reading") : t("ingest.scan")}
      </Button>
    </>
  );

  return (
    <div>
      {variant === "primary" ? (
        <div className="rounded-2xl border border-dashed border-gold/40 bg-background p-5">
          <p className="mb-1 text-sm font-black text-gold">{t("ingest.title")}</p>
          <p className="mb-3 text-xs text-muted">{t("ingest.hint")}</p>
          {trigger}
          <p className="mt-2 text-sm text-muted">{t("ingest.types")}</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">{trigger}</div>
      )}
      {error && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}

      <IngestReviewDialog
        open={Boolean(prep)}
        onOpenChange={(o) => !o && setPrep(null)}
        sourceLabel={prep?.doc.name ?? ""}
        rows={rows}
        patchRow={patchRow}
        onConfirm={confirm}
        showPastTag={prep?.doc.tags.includes("past_creative")}
        extra={
          prep?.imageNeedsTypedText ? (
            <div className="mt-4 space-y-2 rounded-xl border border-gold/30 bg-gold/5 p-3">
              <label htmlFor="ingest-image-note" className="block text-xs font-black text-navy">{t("ingest.imageNoteLabel")}</label>
              <p className="text-xs text-muted">{t("ingest.imageAsk")}</p>
              <Textarea id="ingest-image-note" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("ingest.imageNote")} />
              <Button type="button" size="sm" variant="outline" onClick={useTyped} disabled={!typed.trim()}>
                {t("ingest.useTyped")}
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}

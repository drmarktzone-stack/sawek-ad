import type { Locale, MediaAssetLabel, MediaAssetMeta } from "./types";
import { uid } from "./utils";

export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 40 * 1024 * 1024;

const IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);

const DB_NAME = "sawek-ad-media";
const STORE = "files";

export const ASSET_LABELS: { id: MediaAssetLabel; label: Record<Locale, string> }[] = [
  { id: "logo", label: { he: "לוגו", ar: "شعار", en: "Logo" } },
  { id: "exterior", label: { he: "חזית / מבנה", ar: "واجهة / مبنى", en: "Exterior" } },
  { id: "interior", label: { he: "פנים", ar: "داخل", en: "Interior" } },
  { id: "doctor", label: { he: "רופא/ה", ar: "طبيب/ة", en: "Doctor" } },
  { id: "waiting_room", label: { he: "חדר המתנה", ar: "غرفة انتظار", en: "Waiting room" } },
  { id: "before_after", label: { he: "לפני/אחרי (רק אם הועלה)", ar: "قبل/بعد (فقط إن رُفع)", en: "Before/after (only if uploaded)" } },
  { id: "other", label: { he: "אחר", ar: "آخر", en: "Other" } },
];

export function assetLabelText(id: MediaAssetLabel, locale: Locale): string {
  return ASSET_LABELS.find((x) => x.id === id)?.label[locale] ?? id;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
  });
}

export function classifyFile(file: File): { kind: "image" | "video" } | { kind: null; reason: "type" | "size" } {
  const name = file.name.toLowerCase();
  const image = IMAGE_MIME.has(file.type) || /\.(jpe?g|png|webp)$/.test(name);
  const video = VIDEO_MIME.has(file.type) || /\.(mp4|webm)$/.test(name);
  if (image) {
    if (file.size > IMAGE_MAX_BYTES) return { kind: null, reason: "size" };
    return { kind: "image" };
  }
  if (video) {
    if (file.size > VIDEO_MAX_BYTES) return { kind: null, reason: "size" };
    return { kind: "video" };
  }
  return { kind: null, reason: "type" };
}

export function sizeErrorCopy(locale: Locale, kind: "image" | "video" | "type"): string {
  if (kind === "type") {
    return locale === "he"
      ? "רק jpg / png / webp או mp4 / webm."
      : locale === "ar"
        ? "بس jpg / png / webp أو mp4 / webm."
        : "Only jpg / png / webp or mp4 / webm.";
  }
  if (kind === "image") {
    return locale === "he"
      ? "התמונה גדולה מ-8MB."
      : locale === "ar"
        ? "الصورة أكبر من 8MB."
        : "Image exceeds 8MB.";
  }
  return locale === "he"
    ? "הווידאו גדול מ-40MB."
    : locale === "ar"
      ? "الفيديو أكبر من 40MB."
      : "Video exceeds 40MB.";
}

export async function putAssetBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
  });
}

export async function getAssetBlob(id: string): Promise<Blob | undefined> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function deleteAssetBlob(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
    });
  } catch {
    /* private mode / missing db */
  }
}

export async function ingestFile(file: File): Promise<MediaAssetMeta> {
  const classified = classifyFile(file);
  if (classified.kind === null) {
    const err = new Error(classified.reason);
    err.name = classified.reason === "size" ? "AssetSizeError" : "AssetTypeError";
    throw err;
  }
  const id = uid("asset");
  await putAssetBlob(id, file);
  return {
    id,
    kind: classified.kind,
    mime: file.type || (classified.kind === "image" ? "image/jpeg" : "video/mp4"),
    name: file.name,
    size: file.size,
    label: "other",
    note: "",
    createdAt: new Date().toISOString(),
  };
}

export function pickAsset(metas: MediaAssetMeta[] | undefined, index: number): MediaAssetMeta | undefined {
  const list = metas ?? [];
  if (!list.length) return undefined;
  const images = list.filter((m) => m.kind === "image");
  const pool = images.length ? images : list;
  return pool[index % pool.length];
}

export function pickLogo(metas: MediaAssetMeta[] | undefined): MediaAssetMeta | undefined {
  const list = metas ?? [];
  return (
    list.find((m) => m.label === "logo" && m.kind === "image") ??
    list.find((m) => m.kind === "image" && /logo|לוגו|شعار/i.test(m.name))
  );
}

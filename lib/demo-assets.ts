import type { MediaAssetLabel, MediaAssetMeta } from "./types";

export type DemoAssetId = "demo-samer-clinic" | "demo-olive-kitchen" | "demo-sand-boutique";

export type DemoPhotoFile = {
  file: string;
  name: string;
  label: MediaAssetLabel;
  note: string;
};

const CLINIC_PHOTOS: DemoPhotoFile[] = [
  { file: "photo-1.jpg", name: "Sunlit waiting room", label: "waiting_room", note: "offer:photo:clinic-waiting" },
  { file: "photo-2.jpg", name: "Mediterranean clinic facade", label: "exterior", note: "offer:photo:clinic-facade" },
  { file: "photo-3.jpg", name: "Warm empty reception", label: "interior", note: "offer:photo:clinic-reception" },
  { file: "photo-4.jpg", name: "Olive courtyard bench", label: "exterior", note: "offer:photo:clinic-courtyard" },
  { file: "photo-5.jpg", name: "Play-nook shelf, no children", label: "interior", note: "offer:photo:clinic-nook" },
  { file: "photo-6.jpg", name: "Linen window light", label: "interior", note: "offer:photo:clinic-linen" },
];

const OLIVE_PHOTOS: DemoPhotoFile[] = [
  { file: "photo-1.jpg", name: "Mezze and olive oil", label: "other", note: "offer:photo:olive-mezze" },
  { file: "photo-2.jpg", name: "Dusk terrace table", label: "exterior", note: "offer:photo:olive-terrace" },
  { file: "photo-3.jpg", name: "Hummus ceramic bowl", label: "other", note: "offer:photo:olive-hummus" },
  { file: "photo-4.jpg", name: "Empty dining room", label: "interior", note: "offer:photo:olive-interior" },
  { file: "photo-5.jpg", name: "Citrus and linen", label: "other", note: "offer:photo:olive-citrus" },
  { file: "photo-6.jpg", name: "Courtyard two-top", label: "exterior", note: "offer:photo:olive-courtyard" },
];

const SAND_PHOTOS: DemoPhotoFile[] = [
  { file: "photo-1.jpg", name: "One composed rack", label: "interior", note: "offer:photo:sand-rack" },
  { file: "photo-2.jpg", name: "Linen fabric close", label: "other", note: "offer:photo:sand-linen" },
  { file: "photo-3.jpg", name: "Empty dressing alcove", label: "interior", note: "offer:photo:sand-alcove" },
  { file: "photo-4.jpg", name: "Window display, no logo", label: "exterior", note: "offer:photo:sand-window" },
  { file: "photo-5.jpg", name: "Folded knits on wood", label: "interior", note: "offer:photo:sand-folded" },
  { file: "photo-6.jpg", name: "Ivory hangers on rail", label: "interior", note: "offer:photo:sand-hangers" },
];

export function demoPhotoManifest(id: DemoAssetId): DemoPhotoFile[] {
  if (id === "demo-olive-kitchen") return OLIVE_PHOTOS;
  if (id === "demo-sand-boutique") return SAND_PHOTOS;
  return CLINIC_PHOTOS;
}

export function demoPhotoPublicPath(id: DemoAssetId, file: string): string {
  return `/packs/assets/${id}/${file}`;
}

export function demoPhotoAssets(id: DemoAssetId): MediaAssetMeta[] {
  const createdAt = "2026-09-05T12:00:00.000Z";
  return demoPhotoManifest(id).map((row, idx) => ({
    id: `${id}-photo-${idx + 1}`,
    kind: "image" as const,
    mime: "image/jpeg",
    name: row.name,
    size: 1,
    label: row.label,
    note: row.note,
    createdAt,
    publicSrc: demoPhotoPublicPath(id, row.file),
  }));
}

export const DEMO_PHOTO_IDS: readonly DemoAssetId[] = [
  "demo-samer-clinic",
  "demo-olive-kitchen",
  "demo-sand-boutique",
];

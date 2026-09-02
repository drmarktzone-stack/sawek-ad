import type { Intake, Locale, MediaAssetMeta } from "./types";
import { uid } from "./utils";
import { studioStillsForIntake } from "./studio-stills";

export type GraphicPoster = {
  id: string;
  name: Record<Locale, string>;
  palette: [string, string, string];
  dataUrl: string;
};

/** Photography-like in-app stills. No faces, no Clalit mark, no plus-icon posters. */
export function graphicPostersForIntake(intake: Intake): GraphicPoster[] {
  return studioStillsForIntake(intake).map((s) => ({
    id: s.id,
    name: s.name,
    palette: s.palette,
    dataUrl: s.dataUrl,
  }));
}

export function posterToAsset(poster: GraphicPoster, name?: string): MediaAssetMeta {
  return {
    id: uid("asset"),
    kind: "image",
    mime: "image/svg+xml",
    name: name || poster.name.en,
    size: poster.dataUrl.length,
    label: "interior",
    note: `offer:graphic:${poster.id}`,
    createdAt: new Date().toISOString(),
    publicSrc: poster.dataUrl,
  };
}

export function imagenToAsset(dataUrl: string, mime: string): MediaAssetMeta {
  return {
    id: uid("asset"),
    kind: "image",
    mime: mime.startsWith("image/") ? mime : "image/png",
    name: "AI still",
    size: dataUrl.length,
    label: "other",
    note: "offer:imagen",
    createdAt: new Date().toISOString(),
    publicSrc: dataUrl,
  };
}

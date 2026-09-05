import { randomBytes } from "crypto";

type Entry = { bytes: Buffer; mime: string; exp: number; model?: string };
const store = new Map<string, Entry>();
const TTL_MS = 30 * 60 * 1000;
const MAX = 48;

function gc() {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.exp < now) store.delete(k);
  }
  while (store.size > MAX) {
    const first = store.keys().next().value;
    if (first == null) break;
    store.delete(first);
  }
}

/** Persist a generated still so the picker/mockups can GET /api/imagen/:id. */
export function storeImagenImage(
  imageBase64: string,
  mime: string,
  model?: string,
): { id: string; publicUrl: string } {
  gc();
  const cleaned = imageBase64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  const bytes = Buffer.from(cleaned, "base64");
  const id = randomBytes(18).toString("hex");
  store.set(id, {
    bytes,
    mime: mime.startsWith("image/") ? mime : "image/png",
    exp: Date.now() + TTL_MS,
    model,
  });
  return { id, publicUrl: `/api/imagen/${id}` };
}

export function getImagenImage(id: string): { bytes: Buffer; mime: string; model?: string } | null {
  const e = store.get(id);
  if (!e || e.exp < Date.now()) {
    store.delete(id);
    return null;
  }
  return { bytes: e.bytes, mime: e.mime, model: e.model };
}

import { randomBytes } from "crypto";

type Entry = { bytes: Buffer; mime: string; exp: number };
const store = new Map<string, Entry>();
const TTL_MS = 15 * 60 * 1000;
const MAX = 24;

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

export function putTmpImage(bytes: Buffer, mime: string): string {
  gc();
  const id = randomBytes(18).toString("hex");
  store.set(id, { bytes, mime: mime || "image/jpeg", exp: Date.now() + TTL_MS });
  return id;
}

export function getTmpImage(id: string): { bytes: Buffer; mime: string } | null {
  const e = store.get(id);
  if (!e || e.exp < Date.now()) {
    store.delete(id);
    return null;
  }
  return { bytes: e.bytes, mime: e.mime };
}

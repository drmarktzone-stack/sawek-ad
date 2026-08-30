"use client";

import { useEffect, useMemo, useState } from "react";
import type { MediaAssetMeta } from "./types";
import { getAssetBlob } from "./media-assets";

export function useResolvedAssets(metas: MediaAssetMeta[] | undefined): Record<string, string> {
  const list = metas ?? [];
  const key = list.map((m) => `${m.id}:${m.publicSrc ?? ""}`).join("|");
  const publicUrls = useMemo(() => {
    const next: Record<string, string> = {};
    for (const m of list) {
      if (m.publicSrc) next[m.id] = m.publicSrc;
    }
    return next;
  }, [key]);
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const created: string[] = [];
    const need = list.filter((m) => !m.publicSrc);
    (async () => {
      const next: Record<string, string> = {};
      for (const m of need) {
        const blob = await getAssetBlob(m.id);
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        created.push(url);
        next[m.id] = url;
      }
      if (!cancelled) setBlobUrls(next);
    })();
    return () => {
      cancelled = true;
      for (const u of created) URL.revokeObjectURL(u);
    };
    // list is derived from key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { ...blobUrls, ...publicUrls };
}

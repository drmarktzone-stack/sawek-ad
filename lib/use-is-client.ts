"use client";

import { useSyncExternalStore } from "react";

/** False on the server / first SSR snapshot, true on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

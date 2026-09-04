/** Keep in sync with lib/demo.ts DEMO_ID — do not import demo here (storage cycle). */
const CLINIC_DEMO_ID = "demo-samer-clinic";

/** Customer-facing sample packs that must never appear except the clinic demo. */
const BANNED_SAMPLE_RE =
  /יין|\bwine\b|יקב|עיר המותגים|קינג סטור|king store|brand city|aam\.co|rinan|רינאן|رنان|pedi-guide|e3e112bd-d36a-4a10-8b5f-fccf4edfd83d|69101bfd-562d-4837-af0b-781ac60574c9|dbe6d893-40ee-49dc-b363-a2bf694a9c23/i;

export function isAllowedPublishedDemoId(id: string): boolean {
  return id === CLINIC_DEMO_ID;
}

/** Wine, Brand City, King Store, Rinan, Pedi-Guide, and any other non-clinic sample. */
export function isBannedCustomerSample(pack: {
  id?: string;
  name?: string;
  intake?: { businessName?: string; website?: string; category?: string };
}): boolean {
  const id = String(pack.id ?? "");
  if (isAllowedPublishedDemoId(id)) return false;
  const blob = [id, pack.name, pack.intake?.businessName, pack.intake?.website, pack.intake?.category]
    .map((s) => String(s ?? ""))
    .join("\n");
  return BANNED_SAMPLE_RE.test(blob);
}

export function filterCustomerCampaigns<T extends { id?: string; name?: string; intake?: { businessName?: string; website?: string; category?: string } }>(
  packs: T[],
): T[] {
  return packs.filter((p) => !isBannedCustomerSample(p));
}

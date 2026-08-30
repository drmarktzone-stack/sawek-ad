const NO_OFFER_VALUES = [
  "no_offer",
  "אין מבצע",
  "אין מבצע מיוחד",
  "بدون عرض",
  "لا يوجد عرض",
  "no offer",
  "none",
  "no promo",
];

export function isNoOffer(value: string | undefined | null): boolean {
  if (!value) return true;
  const parts = value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((v) => NO_OFFER_VALUES.some((x) => x.toLowerCase() === v));
}

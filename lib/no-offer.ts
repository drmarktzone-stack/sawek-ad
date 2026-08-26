const NO_OFFER_VALUES = [
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
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return NO_OFFER_VALUES.some((x) => x.toLowerCase() === v);
}

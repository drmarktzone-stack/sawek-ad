import type { ClinicProfile } from "./types";

const DAY_INDEX: Record<ClinicProfile["hours"][0]["day"], number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export function upcomingSlots(clinic: ClinicProfile, count = 10): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const now = new Date();
  for (let d = 0; d < 14 && out.length < count; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const jsDay = day.getDay();
    const row = clinic.hours.find((h) => DAY_INDEX[h.day] === jsDay);
    if (!row || row.closed) continue;
    const [oh, om] = row.open.split(":").map(Number);
    const [ch, cm] = row.close.split(":").map(Number);
    const start = new Date(day);
    start.setHours(oh, om, 0, 0);
    const end = new Date(day);
    end.setHours(ch, cm, 0, 0);
    const step = Math.max(clinic.slotMinutes, 10) * 60 * 1000;
    for (let t = start.getTime(); t + step <= end.getTime() && out.length < count; t += step) {
      if (t <= Date.now()) continue;
      const slot = new Date(t);
      out.push({
        iso: slot.toISOString(),
        label: slot.toLocaleString("he-IL", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }
  }
  return out;
}

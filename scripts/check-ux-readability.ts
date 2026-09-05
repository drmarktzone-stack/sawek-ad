import { demoIntake } from "../lib/demo";
import { assemblePack } from "../lib/engine/run";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { channelFields } from "../lib/channel-copy";
import { hoursChips, isHoursWall, stripHoursWall } from "../lib/hours-chips";
import { graphicPostersForIntake } from "../lib/graphic-posters";
import { collectBundleImageUrls } from "../lib/url-ingest";
import { buildSiteAudit } from "../lib/engine/site-audit";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

const intake = demoIntake("he");
const hours = intake.clinicHours || "الأحد 08:00 - 13:00 / 16:00 - 19:30 · الإثنين 08:00 - 13:00 / 16:00 - 19:30 · الثلاثاء 08:00 - 13:00";
const chips = hoursChips(hours, "he", 3);
if (chips.length < 1 || chips.length > 3) fail(`hoursChips count ${chips.length}`);
if (chips.join(" ").length > 180) fail(`hoursChips still a wall: ${chips.join(" | ")}`);
if (chips.some((c) => c.length > 56)) fail(`chip too long ${chips.find((c) => c.length > 56)}`);

const wall = `שעות: ראשון 08:00 - 13:00 / 16:00 - 19:30 · שני 08:00 - 13:00 · שלישי 08:00 - 13:00 · רביעי 08:00 - 13:00`;
if (!isHoursWall(wall)) fail("isHoursWall missed weekly dump");
const stripped = stripHoursWall(`ד״ר סאמר — לפי סדר הגעה. ${wall}`);
if (isHoursWall(stripped)) fail(`stripHoursWall left a wall: ${stripped}`);
if (stripped.length > 90) fail(`stripHoursWall still long (${stripped.length}): ${stripped}`);

const pack = assemblePack(intake, {
  report: validateIntake(intake),
  diagnosis: diagnose(intake, validateIntake(intake)),
  variants: generateVariants(intake),
  agentStatus: {
    intake: "complete",
    diagnostic: "complete",
    strategic: "complete",
    media: "complete",
    optimizer: "complete",
  },
});
const he = channelFields(pack, "he");
const ar = channelFields(pack, "ar");
if (he.tiktokCaption.length > 100) fail(`tiktokCaption HE too long (${he.tiktokCaption.length}): ${he.tiktokCaption}`);
if (ar.tiktokCaption.length > 110) fail(`tiktokCaption AR too long (${ar.tiktokCaption.length}): ${ar.tiktokCaption}`);
if (isHoursWall(he.tiktokCaption)) fail(`tiktokCaption is hours wall: ${he.tiktokCaption}`);
if (isHoursWall(he.posterSupport)) fail(`posterSupport is hours wall: ${he.posterSupport}`);
if (!he.posterHeadline.trim()) fail("posterHeadline empty");
if (he.hoursChips.length > 3) fail(`poster hoursChips ${he.hoursChips.length} > 3`);
if (!he.cta.trim()) fail("cta empty");

const HE_RE = /[\u0590-\u05FF]/;
const AR_RE = /[\u0600-\u06FF]/;
for (const loc of ["he", "ar", "en"] as const) {
  const f = channelFields(pack, loc);
  const blob = [f.posterHeadline, f.posterSupport, f.shortBody, f.cta, f.pageName].join("\n");
  if (loc === "he" && AR_RE.test(blob)) fail(`HE poster leaked Arabic: ${blob.slice(0, 160)}`);
  if (loc === "ar" && HE_RE.test(blob)) fail(`AR poster leaked Hebrew: ${blob.slice(0, 160)}`);
  if (loc === "en" && (HE_RE.test(blob) || AR_RE.test(blob))) fail(`EN poster leaked HE/AR: ${blob.slice(0, 160)}`);
  if (loc === "he" && !HE_RE.test(f.posterHeadline)) fail(`HE posterHeadline missing Hebrew`);
  if (loc === "ar" && !AR_RE.test(f.posterHeadline)) fail(`AR posterHeadline missing Arabic`);
}

const posters = graphicPostersForIntake(intake);
if (posters.length < 4) fail(`graphic posters ${posters.length} < 4`);
for (const p of posters) {
  if (!p.dataUrl.startsWith("data:image/svg+xml")) fail(`${p.id} not svg data url`);
  const decoded = decodeURIComponent(p.dataUrl.split(",")[1] || "");
  if (/clalit|كلاليت|כללית/i.test(decoded)) fail(`${p.id} contains Clalit mark`);
  if (/<image|photoreal|doctor face|portrait photo/i.test(decoded)) fail(`${p.id} looks like a photo/face`);
  if (!decoded.includes("<svg")) fail(`${p.id} missing svg`);
}

const audit = buildSiteAudit({ ...intake, mediaAssets: [] });
if (!audit.weaknesses.some((w) => w.id === "no-photos")) fail("no-photos weakness missing when mediaAssets empty");
const hoursItem = audit.strengths.find((s) => s.id === "hours");
if (hoursItem && isHoursWall(hoursItem.evidence.he)) fail(`hours evidence still a wall: ${hoursItem.evidence.he}`);

const js = `const hero="/assets/waiting-room-abc123.webp"; const css="url(/assets/clinic-interior.png)"; const cdn="https://cdn.example.com/photos/lobby.jpg";`;
const found = collectBundleImageUrls(js, "https://drsamerped.ai.studio/");
if (!found.some((u) => /waiting-room-abc123.webp/.test(u))) fail(`bundle missing waiting-room: ${JSON.stringify(found)}`);
if (!found.some((u) => /clinic-interior.png/.test(u))) fail(`bundle missing interior: ${JSON.stringify(found)}`);
if (!found.some((u) => /lobby.jpg/.test(u))) fail(`bundle missing cdn jpg: ${JSON.stringify(found)}`);

if (failures.length) {
  console.error("FAIL\\n" + failures.join("\\n"));
  process.exit(1);
}
console.log("PASS ux readability", {
  chips,
  tiktokCaption: he.tiktokCaption,
  posterHeadline: he.posterHeadline,
  posters: posters.map((p) => p.id),
  bundle: found,
});

import { emptyIntake, wizardMissingFields, wizardReady } from "../lib/engine/validate";
import { generateVariants } from "../lib/engine/copy";
import { validateIntake } from "../lib/engine/validate";
import { diagnose } from "../lib/engine/diagnose";
import { generateMedia } from "../lib/engine/media";
import { generateOptimizer } from "../lib/engine/optimizer";
import { generateStrategy } from "../lib/engine/strategy";
import { buildAgency } from "../lib/engine/agency";
import { extractFieldsFromText } from "../lib/document-ingest";
import { audienceChipsFor } from "../lib/chips";
import { problemChipsFor } from "../lib/operating-model";
import { ASSET_LABELS } from "../lib/media-assets";
import {
  assetLabelsFor,
  detectVertical,
  isPediatrics,
  showsHmoAudience,
  CLINIC_LEAK_NEEDLES_AR,
  CLINIC_LEAK_NEEDLES_HE,
} from "../lib/vertical";
import { demoIntake } from "../lib/demo";
import type { Intake } from "../lib/types";

const failures: string[] = [];

function packBlob(intake: Intake): string {
  const variants = generateVariants(intake);
  const report = validateIntake(intake);
  const diagnosis = diagnose(intake, report);
  const media = generateMedia(intake);
  const optimizer = generateOptimizer(intake, media);
  const strategy = generateStrategy(intake, diagnosis);
  const agency = buildAgency({
    intake,
    intakeReport: report,
    diagnosis,
    media,
    optimizer,
    variants,
  });
  return [
    ...variants.map((v) => `${v.headline}\n${v.primaryText}\n${v.cta}`),
    ...agency.creative.pieces.map((p) => `${p.title}\n${p.body}`),
    JSON.stringify(strategy),
    JSON.stringify(diagnosis),
  ].join("\n");
}

function restaurant(name: string, extra: Partial<Intake> = {}): Intake {
  return {
    ...emptyIntake(),
    businessName: name,
    category: "مطعم شاورما / burger",
    description: "شاورما وبرغر وحلويات. جت أولاً. واتساب للمكان.",
    location: "باقة",
    whatsapp: "052-1112233",
    audience: "local_families",
    biggestProblem: "unknown",
    uniqueAdvantage: "location",
    mainGoal: "walk_in",
    clinicHours: "جت أولاً بدون مواعيد",
    ...extra,
  };
}

const grill = restaurant("Grill King");
const afandena = restaurant("أفندنا", {
  category: "حلويات وبرغر",
  description: "dessert and burger shop. עוגות והמבורגר.",
});

if (detectVertical(grill) !== "restaurant") failures.push(`Grill King vertical=${detectVertical(grill)}`);
if (detectVertical(afandena) !== "restaurant") failures.push(`Afandena vertical=${detectVertical(afandena)}`);

for (const [label, intake] of [
  ["Grill King", grill],
  ["Afandena", afandena],
] as const) {
  const blob = packBlob(intake);
  for (const n of CLINIC_LEAK_NEEDLES_AR) {
    if (blob.includes(n)) failures.push(`${label} AR leak «${n}»`);
  }
  for (const n of CLINIC_LEAK_NEEDLES_HE) {
    if (blob.includes(n)) failures.push(`${label} HE leak «${n}»`);
  }
  const aud = audienceChipsFor(intake);
  if (aud.some((c) => c.id === "clalit" || c.label.ar.includes("كلاليت"))) {
    failures.push(`${label} still shows HMO audience chips`);
  }
  const unknown = problemChipsFor(intake).find((c) => c.id === "unknown")!;
  if (unknown.label.ar.includes("العيادة")) failures.push(`${label} unknown chip still clinic AR`);
  const assets = assetLabelsFor(intake, ASSET_LABELS);
  if (assets.some((a) => a.id === "doctor" || a.id === "waiting_room")) {
    failures.push(`${label} still offers doctor/waiting-room photo roles`);
  }
}

const rinan: Intake = {
  ...emptyIntake(),
  businessName: "مركز رنان",
  category: "בריכה הידרותרפיה",
  description: "טיפולים בבריכה. קופת חולים / كلاليت. hydrotherapy pool in Jatt.",
  location: "جت",
  whatsapp: "052-0000000",
  audience: "clalit",
  biggestProblem: "unknown",
  uniqueAdvantage: "location",
  mainGoal: "walk_in",
};
if (detectVertical(rinan) !== "pool") failures.push(`Rinan vertical=${detectVertical(rinan)}`);
const rinanBlob = packBlob(rinan);
for (const n of ["مستشفى", "صورة دكتور", "العيادة", "الولد بيمرض", "הילד חולה", "جيبوه عالعيادة"]) {
  if (rinanBlob.includes(n)) failures.push(`Rinan leak «${n}»`);
}
if (!/كلاليت|כללית|clalit/i.test(rinanBlob + rinan.description)) {
  // HMO mention in intake is allowed; copy may echo coverage only if flagged
}

const extracted = extractFieldsFromText("اسم العمل: مركز رنان\nالعنوان: جت\n", "facts-ar.txt");
if (extracted.businessName !== "مركز رنان") {
  failures.push(`AR ingest name got ${JSON.stringify(extracted.businessName)}`);
}
const extracted2 = extractFieldsFromText("اسم المنشأة: أفندنا\n", "facts-ar.txt");
if (extracted2.businessName !== "أفندنا") failures.push(`منشأة ingest got ${JSON.stringify(extracted2.businessName)}`);
const extracted3 = extractFieldsFromText("الاسم: ستوديو نور\n", "facts-ar.txt");
if (extracted3.businessName !== "ستوديو نور") failures.push(`الاسم ingest got ${JSON.stringify(extracted3.businessName)}`);

const missing = wizardMissingFields(emptyIntake());
if (missing.length < 5) failures.push(`empty wizard missing too few: ${missing.map((m) => m.field).join(",")}`);
if (wizardReady(emptyIntake())) failures.push("empty intake should not be wizardReady");
if (!wizardReady(grill)) failures.push("filled restaurant should be wizardReady");

const namedClinic: Intake = {
  ...emptyIntake(),
  businessName: "מרפאה",
  category: "clinic",
  description: "מרפאת ילדים בבאקה",
};
if (detectVertical(namedClinic) !== "clinic") {
  failures.push(`named מרפאה should stay clinic, got ${detectVertical(namedClinic)}`);
}

const pediProduct: Intake = {
  ...emptyIntake(),
  businessName: "pedi-guide",
  category: "MedicalOrganization",
  description:
    "AI-powered pediatric health platform with 21 smart tools for child health. Content by Dr. Samer Abu Mukh, pediatrician. An AI doctor and verified medical information.",
};
if (detectVertical(pediProduct) === "clinic") {
  failures.push(`Pedi-Guide detectVertical must NOT be clinic (got ${detectVertical(pediProduct)})`);
}
if (isPediatrics(pediProduct)) failures.push("Pedi-Guide isPediatrics should be false");
if (showsHmoAudience(pediProduct)) failures.push("Pedi-Guide should not show HMO audience");
const pediAud = audienceChipsFor(pediProduct);
if (pediAud.some((c) => c.id === "clalit" || c.id === "maccabi" || c.id === "meuhedet")) {
  failures.push("Pedi-Guide still shows kupat chips");
}
if (!pediAud.some((c) => c.id === "parents")) failures.push("Pedi-Guide missing parents chip");
const pediProblems = problemChipsFor(pediProduct);
if (pediProblems.some((c) => /הילד חולה|الولد مريض|ER|מיון/.test(`${c.label.he} ${c.label.ar} ${c.label.en}`))) {
  failures.push("Pedi-Guide problem chips still use clinic ER/sick-child copy");
}
if (!pediProblems.some((c) => c.id === "unwell_uncertain" || /unwell|לא בטוב|מטריד/.test(c.label.en + c.label.he))) {
  failures.push("Pedi-Guide missing product unwell/trusted-info problem chips");
}

const pediCopy: Intake = {
  ...pediProduct,
  type: "product",
  operatingModel: "paid",
  website: "https://www.pedi-guide.com",
  audience: "parents",
  biggestProblem: "ילד עם חום ב־3 בלילה ולא בטוחים מה לעשות?",
  problemCustom: true,
  uniqueAdvantage:
    "רופא AI, מחשבון אקמול וכלים בדוקים להורים. בעברית. לא מחליף רופא — עוזר להבין מתי לפנות עכשיו.",
  advantageCustom: true,
  mainGoal: "installs",
  offer: "no_offer",
};
const pediCopyBlob = packBlob(pediCopy);
if (!/חום|3 בלילה|לא בטוחים/.test(pediCopyBlob)) {
  failures.push("Pedi-Guide spoken copy missing extracted fever/uncertainty problem");
}
if (/הילד חולה/.test(pediCopyBlob)) failures.push("Pedi-Guide copy leaked הילד חולה");
if (/כללית/.test(pediCopyBlob)) failures.push("Pedi-Guide copy leaked כללית");
if (!/רופא AI|אקמול|כלים/.test(pediCopyBlob)) {
  failures.push("Pedi-Guide copy missing uniqueAdvantage");
}

const demo = demoIntake("ar");
const aamRetail: Intake = {
  ...emptyIntake(),
  businessName: "עיר המותגים",
  category: "אופנה",
  description: "חנות מותגים ושופינג בבאקה.",
};
if (detectVertical(aamRetail) !== "retail") {
  failures.push(`aam/אופנה should be retail, got ${detectVertical(aamRetail)}`);
}
if (showsHmoAudience(aamRetail)) failures.push("retail should hide HMO audience");
const aamAud = audienceChipsFor(aamRetail);
if (aamAud.some((c) => c.id === "clalit" || c.id === "maccabi")) {
  failures.push("retail still shows kupat-holim chips");
}

if (detectVertical(demo) !== "clinic") failures.push(`demo vertical=${detectVertical(demo)}`);
const demoBlob = packBlob(demo);
if (!demoBlob.includes("جيبوه عالعيادة") && !demoBlob.includes("العيادة")) {
  failures.push("pediatric demo lost clinic language");
}

if (failures.length) {
  console.error("FAIL\n" + failures.join("\n"));
  process.exit(1);
}
console.log("PASS vertical smoke");
console.log("Grill King vertical:", detectVertical(grill));
console.log("Rinan vertical:", detectVertical(rinan));
console.log("Pedi-Guide vertical:", detectVertical(pediProduct));
console.log("named מרפאה vertical:", detectVertical(namedClinic));
console.log("עיר המותגים vertical:", detectVertical(aamRetail));
console.log("ingest:", extracted.businessName);
console.log("missing empty:", missing.map((m) => m.field).join(","));

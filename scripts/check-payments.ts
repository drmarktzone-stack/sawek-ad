/**
 * Honest Pro checkout: secrets stay off public pages; Bit + Hapoalim only after auth + method.
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  DEFAULT_BANK_ACCOUNT,
  DEFAULT_BANK_BRANCH,
  DEFAULT_BANK_NAME,
  DEFAULT_BIT_PHONE,
  bankInstructions,
  bitInstructions,
  formatBitPhone,
  paypalLiveEnabled,
  paypalMeUrl,
  publicPayloadLeaksReceiveDetails,
  publicPayments,
  receiveDetails,
} from "../lib/payments";
import { generateOrderCode } from "../lib/order-code";
import { PRIVACY, TERMS } from "../lib/legal";
import { copy } from "../lib/i18n";

const failures: string[] = [];
function fail(m: string) {
  failures.push(m);
}

if (formatBitPhone("0528885800") !== "052-8885800") fail("format 0528885800");
if (formatBitPhone("052-888-5800") !== "052-8885800") fail("format 052-888-5800");
if (formatBitPhone(DEFAULT_BIT_PHONE) !== "052-8885800") fail("default phone format");

process.env.PAYPAL_ME = "https://paypal.me/should-never-leak";
process.env.BANK_IBAN = "";
process.env.BANK_INSTRUCTIONS = "IBAN IL00FAKE000000000000000";

const pub = publicPayments({ stripeEnabled: false, stripePublishableKey: "" });

if (pub.paypalEnabled !== false) fail("paypalEnabled must be false");
if (pub.paypalMe !== "") fail("paypalMe must stay empty even if PAYPAL_ME is set");
if (pub.paypalOffline !== true) fail("paypalOffline");
if (paypalLiveEnabled()) fail("paypalLiveEnabled must be false");
if (paypalMeUrl() !== "") fail("paypalMeUrl must be empty");
if (pub.stripeEnabled !== false) fail("stripeEnabled false without keys");
if (!pub.bitConfigured) fail("bitConfigured");
if (!pub.bankConfigured) fail("bankConfigured");
if (publicPayloadLeaksReceiveDetails(pub)) fail("publicPayments leaked receive details");
if ("bitPhone" in pub) fail("publicPayments must omit bitPhone");
if ("bankAccount" in pub) fail("publicPayments must omit bankAccount");
if ("bankBranch" in pub) fail("publicPayments must omit bankBranch");
if ("bankInstructions" in pub) fail("publicPayments must omit bankInstructions");

const code = generateOrderCode("user-1:monthly:bit");
if (!/^SAWEK-[A-F0-9]{4}$/.test(code)) fail(`order code format ${code}`);
if (generateOrderCode("user-1:monthly:bit") !== code) fail("order code should be stable for the same seed");

const bitRecv = receiveDetails({ method: "bit", interval: "monthly", orderCode: code });
if (bitRecv.method !== "bit") fail("receive bit method");
else if (bitRecv.bitPhone !== "052-8885800") fail(`receive bitPhone ${bitRecv.bitPhone}`);
if (bitRecv.amountIls !== 99) fail(`receive monthly amount ${bitRecv.amountIls}`);
if (bitRecv.orderCode !== code) fail("receive order code");
if (!/סאמר|Drmarktzone|Markt/.test(bitRecv.holder)) fail(`holder ${bitRecv.holder}`);

const bankRecv = receiveDetails({ method: "bank", interval: "yearly", orderCode: "SAWEK-TEST" });
if (bankRecv.method !== "bank") fail("receive bank method");
else {
  if (bankRecv.bankName !== DEFAULT_BANK_NAME) fail(`bankName ${bankRecv.bankName}`);
  if (bankRecv.bankBranch !== DEFAULT_BANK_BRANCH) fail(`bankBranch ${bankRecv.bankBranch}`);
  if (bankRecv.bankAccount !== DEFAULT_BANK_ACCOUNT) fail(`bankAccount ${bankRecv.bankAccount}`);
  if (bankRecv.bankCode !== "12") fail(`bankCode ${bankRecv.bankCode}`);
  if (bankRecv.bankIban !== "") fail("bankIban must not be invented");
}
if (bankRecv.amountIls !== 990) fail(`receive yearly amount ${bankRecv.amountIls}`);

const bank = bankInstructions();
const bit = bitInstructions();
if (!bank.includes("בנק הפועלים")) fail("bank instructions missing Hebrew bank name");
if (!bank.includes("666")) fail("bank instructions missing branch");
if (!bank.includes("422494")) fail("bank instructions missing account");
if (/IL\d{2}/.test(bank) || /IBAN IL/i.test(bank)) fail("bank instructions invented an IBAN");
if (!bit.includes("052-8885800")) fail("bit instructions missing phone");

const confirmSrc = readFileSync(join(process.cwd(), "app/api/billing/confirm/route.ts"), "utf8");
if (/interval:\s*method/.test(confirmSrc)) fail("confirm must not store payment method as billing_interval");
if (!confirmSrc.includes("existingInterval") && !confirmSrc.includes("billing_interval")) {
  fail("confirm must preserve billing_interval");
}

const leakRe = /052-8885800|0528885800|422494/;
const publicFiles = [
  "components/pricing-page.tsx",
  "components/about-page.tsx",
  "components/home-studio.tsx",
  "components/checkout-page.tsx",
  "app/api/public-config/route.ts",
  "app/pricing/page.tsx",
];
const root = process.cwd();
for (const rel of publicFiles) {
  const txt = readFileSync(join(root, rel), "utf8");
  if (leakRe.test(txt)) fail(`${rel} leaks Bit/bank numbers`);
}

const publicCopyKeys = Object.keys(copy).filter(
  (k) =>
    k.startsWith("about.") ||
    k.startsWith("pricing.") ||
    k.startsWith("checkout.") ||
    k.startsWith("home.plans") ||
    k === "pricing.lead",
);
for (const key of publicCopyKeys) {
  const row = copy[key];
  const blob = `${row.he}\n${row.ar}\n${row.en}`;
  if (leakRe.test(blob)) fail(`i18n ${key} leaks Bit/bank numbers`);
}

function legalBlob(doc: typeof TERMS): string {
  return [doc.lead.he, doc.lead.ar, doc.lead.en, ...doc.sections.flatMap((s) => s.p.flatMap((p) => [p.he, p.ar, p.en]))].join(
    "\n",
  );
}
if (leakRe.test(legalBlob(TERMS))) fail("TERMS leak Bit/bank numbers");
if (leakRe.test(legalBlob(PRIVACY))) fail("PRIVACY leak Bit/bank numbers");

if (failures.length) {
  console.error("check:payments failed:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}
console.log("check:payments ok — public payload clean, receive-details gated, PayPal off, no IBAN.");

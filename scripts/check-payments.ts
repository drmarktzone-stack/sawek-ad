/**
 * Honest Pro checkout: Bit + Bank Hapoalim live, PayPal off, no invented IBAN, no auto-upgrade.
 */
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
  publicPayments,
} from "../lib/payments";

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

if (pub.bitPhone !== "052-8885800") fail(`bitPhone ${pub.bitPhone}`);
if (!pub.bitConfigured) fail("bitConfigured");
if (pub.bankName !== DEFAULT_BANK_NAME) fail(`bankName ${pub.bankName}`);
if (pub.bankBranch !== DEFAULT_BANK_BRANCH) fail(`bankBranch ${pub.bankBranch}`);
if (pub.bankAccount !== DEFAULT_BANK_ACCOUNT) fail(`bankAccount ${pub.bankAccount}`);
if (pub.bankCode !== "12") fail(`bankCode ${pub.bankCode}`);
if (!/סאמר|Drmarktzone|Markt/.test(pub.bankHolder)) fail(`bankHolder ${pub.bankHolder}`);
if (!pub.bankConfigured) fail("bankConfigured");
if (pub.bankIban !== "") fail("bankIban must not be invented");

const bank = bankInstructions();
const bit = bitInstructions();
if (!bank.includes("בנק הפועלים")) fail("bank instructions missing Hebrew bank name");
if (!bank.includes("666")) fail("bank instructions missing branch");
if (!bank.includes("422494")) fail("bank instructions missing account");
if (/IL\d{2}/.test(bank) || /IBAN IL/i.test(bank)) fail("bank instructions invented an IBAN");
if (!bit.includes("052-8885800")) fail("bit instructions missing phone");

if (failures.length) {
  console.error("check:payments failed:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}
console.log("check:payments ok — Bit + Hapoalim live, PayPal off, no IBAN, no fake Stripe.");

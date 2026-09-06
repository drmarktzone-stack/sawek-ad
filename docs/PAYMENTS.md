# Pro payments — Bit + Bank Hapoalim

Owner decision: **PayPal Business for `drmarktzone@gmail.com` is permanently deactivated.** Live checkout must not enable PayPal or `paypal.me`.

Customers pay Pro (₪99 / month or ₪990 / year) after they sign in:

1. **`/pricing`** — plans, features, and price only. Primary CTA «שדרגו ל־Pro». No Bit number and no bank account on this public page.
2. **Auth gate** — checkout requires a session. Logged-out visitors go to login/signup with `?next=/checkout`.
3. **`/checkout`** — order summary, legal links, method cards: Bit | העברה בנקאית (PayPal stays offline). Stripe card only if keys are live.
4. **After a method is chosen** — authenticated `POST /api/billing/receive-details` returns:
   - a short **order / reference code** (`SAWEK-XXXX`) to put in the Bit / transfer note
   - Bit `052-8885800` **or** Hapoalim branch/account — not before
   - amount + holder name
5. **«שילמתי»** stores a **pending review**. Pro is **never** auto-granted.
6. Owner confirms on **`/billing/bank`**.
7. **`/checkout/pending`** explains what happens next. No credential dump.

`GET /api/public-config` exposes only flags (`bitConfigured`, `bankConfigured`, `paypalEnabled: false`, `stripeEnabled`). It must **not** include Bit phone, branch, or account for anyone.

## Environment variables

These are **receive details** for the authenticated checkout API. Defaults in code and `.env.example` match the owner numbers. Override on Cloud Run if they change.

| Variable | Documented value | Notes |
|---|---|---|
| `BIT_PHONE` | `052-8885800` | Formatted as `052-8885800` |
| `BANK_NAME` | `בנק הפועלים` | Hebrew label in checkout |
| `BANK_NAME_EN` | `Bank Hapoalim` | English helper |
| `BANK_CODE` | `12` | Optional; shown if set |
| `BANK_BRANCH` | `666` | Required for bank block |
| `BANK_ACCOUNT` | `422494` | Required for bank block |
| `BANK_HOLDER` | `ד״ר סאמר / Drmarktzone (Markt)` | Business / owner name |
| `BANK_INSTRUCTIONS` | *(empty)* | Optional extra note. Do not invent an IBAN. |
| `BIT_INSTRUCTIONS` | *(empty)* | Optional extra note. |
| `BANK_IBAN` | *(unset)* | Only set a real IBAN. The UI never invents one. |
| `PAYPAL_ME` | *(unset)* | Do not set. Checkout ignores it. |
| `STRIPE_*` | *(unset)* | Card checkout stays disabled until all Stripe keys + prices exist. |

## Cloud Run

Service host today: `sawek-ad-308665814452.me-west1.run.app` (region `me-west1`).

```bash
gcloud run services update sawek-ad \
  --project=project-8fd8a005-ae6d-4139-ab4 \
  --region=me-west1 \
  --update-env-vars="BIT_PHONE=052-8885800,BANK_NAME=בנק הפועלים,BANK_NAME_EN=Bank Hapoalim,BANK_CODE=12,BANK_BRANCH=666,BANK_ACCOUNT=422494,BANK_HOLDER=ד״ר סאמר / Drmarktzone (Markt)"
```

Do **not** add `PAYPAL_ME`. If `PAYPAL_ME` is already on the service, remove it:

```bash
gcloud run services update sawek-ad \
  --project=project-8fd8a005-ae6d-4139-ab4 \
  --region=me-west1 \
  --remove-env-vars=PAYPAL_ME
```

Console path: Cloud Run → service → Edit & deploy new revision → Variables & secrets.

## Honesty checks

```bash
npm run check:payments
```

Confirms Bit phone formatting, Hapoalim branch/account, no invented IBAN, PayPal off, public payload has **no** receive secrets, and marketing/legal copy does not leak numbers.

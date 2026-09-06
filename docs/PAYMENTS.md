# Pro payments — Bit + Bank Hapoalim

Owner decision: **PayPal Business for `drmarktzone@gmail.com` is permanently deactivated.** Live checkout must not enable PayPal or `paypal.me`.

Customers pay Pro (₪99 / month or ₪990 / year) with:

1. **Bit** — receive to `052-8885800`
2. **Bank transfer (העברה בנקאית)** — בנק הפועלים, branch `666`, account `422494`

After the customer taps **«שילמתי»**, the app stores a **pending review**. Pro is **never** auto-granted. The owner confirms by hand on `/billing/bank`. Stripe card checkout stays optional and off until real keys are set. There is no fake “payment succeeded” path.

## Environment variables

These are **public receive details** (shown on `/pricing`). They are not card secrets. Defaults in code and `.env.example` match the owner numbers. Override on Cloud Run if they change.

| Variable | Documented value | Notes |
|---|---|---|
| `BIT_PHONE` | `052-8885800` | Formatted as `052-8885800` |
| `BANK_NAME` | `בנק הפועלים` | Hebrew label on checkout |
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

`GET /api/public-config` exposes `bitConfigured`, `bankConfigured`, structured Bit/bank fields, `paypalEnabled: false`, `paypalMe: ""`, `stripeEnabled: false` (unless Stripe is fully wired).

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

Confirms Bit phone formatting, Hapoalim branch/account, no invented IBAN, and PayPal off in the public payload.

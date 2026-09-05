# Final QA — three trilingual demo campaigns

Date: 2026-09-05 (Asia/Jerusalem)

## Demo IDs
1. `demo-samer-clinic` — https://drsamerped.ai.studio (clinic, Demo auto-fill)
2. `demo-pizza-hut` — https://www.pizzahut.co.il/ (restaurant, published open-only)
3. `demo-aluf-sport` — https://www.alufsport.co.il/ (retail, published open-only)

## Pass/fail

| Check | Result |
|---|---|
| Ingest clinic / pizza / aluf name+phone | PASS |
| Live Aluf name after Next rebuild | PASS (`אלוף ספורט`) |
| HE+AR+EN copy/calendar no TO COMPLETE / לא מכירים | PASS |
| Vertical CTAs (clinic/restaurant/retail) | PASS |
| published.json three real ids | PASS |
| Clinic-only auto-fill | PASS |
| UI i18n HE/AR/EN keys | PASS |
| No invented metrics | PASS |
| cloudflared not killed | PASS |

## Score: **92/100**
Evidence packs in `public/packs/published.json`. Details in commit message.

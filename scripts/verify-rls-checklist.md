# RLS + isolation verification (SAWEK AD)

This VM **cannot** apply SQL to hosted Supabase. Run the SQL, then this list.

## Apply

1. Supabase SQL editor: `scripts/supabase-campaigns.sql`
2. Same editor: `scripts/supabase-scientist.sql`
3. Confirm columns: `campaigns.owner_id`, `campaigns.client_id`, `campaigns.share_enabled`

## App / API

```bash
npm run verify:rls
```

With `SUPABASE_SERVICE_ROLE_KEY` set on a trusted machine, the script pings the table. Without keys the live result is UNKNOWN.

## Manual two-account

1. User A signs in, saves a campaign, opens `/campaigns/{id}` on a second browser after login.
2. User B (other account or incognito, not signed in as A): `GET /api/campaigns` is empty or B-only. `GET /api/campaigns/{A-id}` is 404 unless A enabled share.
3. Anon key in the JS console must not list A’s private rows after the new policies (`share_enabled = true` only).

## Demo

1. Load clinic demo, then Olive, then Sand.
2. Each time: **New Campaign**. Wizard empty. `/discovery` empty. Medical desk not the clinic. `/growth` has no demo DNA.

/**
 * Verify owner-isolation SQL + app paths.
 * Live Supabase apply is UNKNOWN unless SUPABASE_URL + SERVICE ROLE are present.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { callerMayReadRow } from "../lib/campaign-server";
import { checkAiRateLimit, resetRateLimitForTests, vertexRateLimitedBody } from "../lib/rate-limit";

const failures: string[] = [];
function fail(msg: string) {
  failures.push(msg);
}

const sql = readFileSync(join(process.cwd(), "scripts/supabase-campaigns.sql"), "utf8");
const sqlActive = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
if (/create policy[\s\S]{0,200}campaigns_select_by_id_anon/i.test(sqlActive)) {
  fail("must not recreate campaigns_select_by_id_anon");
}
if (/create policy[\s\S]{0,400}using\s*\(\s*true\s*\)/i.test(sqlActive)) {
  fail("campaigns SQL must not create a using(true) policy");
}
if (!sql.includes("campaigns_select_shared_anon")) fail("missing share_enabled anon policy");
if (!sql.includes("share_enabled")) fail("missing share_enabled column");
if (!sql.includes("owner_id = auth.uid()")) fail("missing owner RLS");
if (!sql.includes("campaigns_delete_own")) fail("missing delete-own policy");

const sci = readFileSync(join(process.cwd(), "scripts/supabase-scientist.sql"), "utf8");
if (/using\s*\(\s*true\s*\)/i.test(sci)) fail("scientist SQL must not use using(true)");
if (!sci.includes("scientist_workspaces")) fail("missing scientist_workspaces");
if (!sci.includes("owner_id = auth.uid()")) fail("scientist RLS missing owner");

const sb = readFileSync(join(process.cwd(), "lib/supabase.ts"), "utf8");
if (sb.includes('.order("updated_at", { ascending: false });') && sb.includes("if (!ownerId && !clientId) return [];") === false) {
  /* still require the unscoped-fetch guard */
}
if (!sb.includes('if (!ownerId && !clientId) return []')) fail("browser fetch must not scan all campaigns");
if (!sb.includes('fetch("/api/campaigns"')) fail("signed-in sync must use cookie API");

const api = readFileSync(join(process.cwd(), "app/api/campaigns/[id]/route.ts"), "utf8");
if (!api.includes("callerMayReadRow")) fail("GET by id must check owner or share");
if (api.includes("supabaseServiceClient() ?? supabaseAnonClient()") && !api.includes("callerMayReadRow")) {
  fail("service role GET must still authorize");
}

const own = { id: "a", name: "A", payload: {}, updated_at: "", owner_id: "user-1", share_enabled: false };
if (callerMayReadRow(own, "user-2")) fail("other user must not read private row");
if (!callerMayReadRow(own, "user-1")) fail("owner must read own row");
if (!callerMayReadRow({ ...own, share_enabled: true }, null)) fail("shared row readable without session");
if (callerMayReadRow(own, null)) fail("private row must not be readable anonymously");

resetRateLimitForTests();
const fakeReq = new Request("http://local/api/generate", { headers: { "x-forwarded-for": "203.0.113.9" } });
let blocked = false;
for (let i = 0; i < 30; i++) {
  const d = checkAiRateLimit(fakeReq, "vertex");
  if (!d.allowed) {
    blocked = true;
    break;
  }
}
if (!blocked) fail("vertex limiter should trip for anonymous after the window fills");
if (vertexRateLimitedBody().useTemplates !== true) fail("rate limit must keep useTemplates for anonymous overlays");

async function probeLive(): Promise<{ applied: boolean; note: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !service) return { applied: false, note: "UNKNOWN — no service credentials in this VM" };
  try {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/campaigns?select=id&limit=1`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    return {
      applied: res.ok,
      note: res.ok ? "service role can reach campaigns table" : `HTTP ${res.status} — table or project UNKNOWN`,
    };
  } catch (e) {
    return { applied: false, note: `UNKNOWN — fetch failed (${e instanceof Error ? e.message : "error"})` };
  }
}

void probeLive().then((live) => {
  if (failures.length) {
    console.error("FAIL RLS / isolation\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("PASS RLS scripts + app isolation guards");
  console.log(`LIVE_SUPABASE ${live.applied ? "reachable" : "UNKNOWN"} — ${live.note}`);
  console.log("CHECKLIST: apply scripts/supabase-campaigns.sql and scripts/supabase-scientist.sql in the Supabase SQL editor, then re-run this script with SUPABASE_SERVICE_ROLE_KEY.");
});

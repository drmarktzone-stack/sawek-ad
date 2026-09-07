import { NextResponse } from "next/server";
import { applyAuthCookies, sessionFromRequest, supabaseServiceClient } from "@/lib/auth-server";
import { SCIENTIST_FEATURE_TYPE, type GrowthWorkspace } from "@/lib/scientist/types";
import { listOwnedCampaignRows } from "@/lib/campaign-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWorkspace(v: unknown): v is GrowthWorkspace {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && typeof o.businessId === "string" && Boolean(o.business) && Boolean(o.dna);
}

/** Owner-scoped scientist workspaces. Anonymous → empty. */
export async function GET(req: Request) {
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: true, workspaces: [], reason: "anonymous" }, { status: 200 });
  }
  const workspaces: GrowthWorkspace[] = [];
  const service = supabaseServiceClient();
  if (service) {
    try {
      const dedicated = await service
        .from("scientist_workspaces")
        .select("payload")
        .eq("owner_id", session.user.id)
        .order("updated_at", { ascending: false });
      if (!dedicated.error && Array.isArray(dedicated.data)) {
        for (const row of dedicated.data) {
          if (isWorkspace(row.payload)) workspaces.push(row.payload);
        }
      }
    } catch {
      /* table may not exist yet */
    }
  }
  if (!workspaces.length) {
    const rows = await listOwnedCampaignRows(session.user.id);
    for (const row of rows) {
      if (row.feature_type !== SCIENTIST_FEATURE_TYPE) continue;
      if (isWorkspace(row.payload)) workspaces.push(row.payload);
    }
  }
  const res = NextResponse.json({ ok: true, workspaces }, { status: 200 });
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}

export async function POST(req: Request) {
  const { session, tokens, refreshed } = await sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const workspace =
    body && typeof body === "object" && "workspace" in body
      ? (body as { workspace: unknown }).workspace
      : body;
  if (!isWorkspace(workspace) || workspace.sample) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  const stamped: GrowthWorkspace = {
    ...workspace,
    ownerId: session.user.id,
    updatedAt: new Date().toISOString(),
  };
  const service = supabaseServiceClient();
  if (service) {
    try {
      const dedicated = await service.from("scientist_workspaces").upsert({
        id: stamped.id,
        owner_id: session.user.id,
        client_id: stamped.clientId ?? null,
        business_id: stamped.businessId,
        payload: stamped,
        updated_at: stamped.updatedAt,
      });
      if (!dedicated.error) {
        const res = NextResponse.json({ ok: true, id: stamped.id, store: "scientist_workspaces" }, { status: 200 });
        if (refreshed && tokens) applyAuthCookies(res, req, tokens);
        return res;
      }
    } catch {
      /* fall through to campaigns blob */
    }
    try {
      await service.from("campaigns").upsert({
        id: stamped.id,
        name: `Scientist · ${stamped.business.name || stamped.businessId}`,
        payload: stamped,
        updated_at: stamped.updatedAt,
        feature_type: SCIENTIST_FEATURE_TYPE,
        owner_id: session.user.id,
        client_id: stamped.clientId ?? null,
        share_enabled: false,
      });
    } catch {
      /* local is enough */
    }
  }
  const res = NextResponse.json({ ok: true, id: stamped.id, store: service ? "campaigns_blob" : "local_only" }, { status: 200 });
  if (refreshed && tokens) applyAuthCookies(res, req, tokens);
  return res;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { facebookConfigured, linkedinConfigured, sanitizeClientId } from "@/lib/social/config";
import { statusForClient } from "@/lib/social/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const clientId =
    sanitizeClientId(url.searchParams.get("clientId")) ||
    sanitizeClientId(jar.get("sawek_client_id")?.value);
  const st = clientId
    ? await statusForClient(clientId, jar)
    : {
        facebook: { connected: false },
        instagram: { connected: false },
        linkedin: { connected: false },
        needs_service_role: stNeeds(),
      };
  return NextResponse.json({
    facebook: st.facebook,
    instagram: st.instagram,
    linkedin: st.linkedin,
    configured: { facebook: facebookConfigured(), linkedin: linkedinConfigured() },
    needs_service_role: st.needs_service_role,
  });
}

function stNeeds(): boolean {
  return !String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
}

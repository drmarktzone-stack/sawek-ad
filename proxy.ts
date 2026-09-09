import { NextResponse, type NextRequest } from "next/server";

/**
 * Imagen is part of the GCP $300 Create Complete Ad path.
 * Quota is enforced by /api/imagen rate limits, not a paywall.
 * A previous plan_required 403 blocked every still for signed-out users.
 */
export async function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/imagen"],
};

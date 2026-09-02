import { NextResponse, type NextRequest } from "next/server";
import { planFromRequest } from "@/lib/auth-server";

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/api/imagen") {
    const plan = await planFromRequest(req);
    if (plan !== "pro") {
      return NextResponse.json(
        { ok: false, reason: "plan_required", error: "plan_required", images: [] },
        { status: 403 },
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/imagen"],
};

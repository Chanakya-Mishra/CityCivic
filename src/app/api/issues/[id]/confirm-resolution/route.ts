import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { confirmResolution } from "@/lib/dispute";
import { serverCache } from "@/lib/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please verify via Email OTP." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const result = await confirmResolution(id, session.userId);

    // Invalidate caches
    await serverCache.expireTags(["issues", "analytics", "map", "contractors", `issue:${id}`]);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to confirm resolution." },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { upvoteIssue } from "@/lib/severity";
import { serverCache } from "@/lib/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to upvote. Please verify via Email OTP." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { userLat, userLng } = body;

    const result = await upvoteIssue(id, session.userId, userLat, userLng);

    // Invalidate affected caches
    await serverCache.expireTags(["issues", "analytics", "map", "leaderboard", `issue:${id}`]);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to register upvote." },
      { status: 400 }
    );
  }
}

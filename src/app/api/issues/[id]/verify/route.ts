import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { submitVerification } from "@/lib/severity";
import { serverCache } from "@/lib/cache";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to submit verification. Please verify via Email OTP." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { isStillPresent, hazardPerception = "MODERATE", userLat, userLng, comment } = body;

    if (isStillPresent === undefined) {
      return NextResponse.json(
        { error: "Missing required field: 'isStillPresent' (boolean)." },
        { status: 400 }
      );
    }

    const result = await submitVerification({
      issueId: id,
      userId: session.userId,
      isStillPresent: Boolean(isStillPresent),
      hazardPerception: hazardPerception as any,
      userLat: userLat ? parseFloat(userLat) : undefined,
      userLng: userLng ? parseFloat(userLng) : undefined,
      comment,
    });

    // Invalidate caches
    await serverCache.expireTags(["issues", "analytics", "map", "leaderboard", `issue:${id}`]);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit verification." },
      { status: 400 }
    );
  }
}

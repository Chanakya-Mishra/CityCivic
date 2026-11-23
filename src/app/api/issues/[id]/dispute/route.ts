import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { disputeResolution } from "@/lib/dispute";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to contest a resolution. Please verify via Email OTP." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { reason, evidencePhotoUrl } = body;

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: "Please provide a specific reason explaining why this issue is not fixed." },
        { status: 400 }
      );
    }

    const result = await disputeResolution({
      issueId: id,
      userId: session.userId,
      reason: reason.trim(),
      evidencePhotoUrl,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit dispute." },
      { status: 400 }
    );
  }
}

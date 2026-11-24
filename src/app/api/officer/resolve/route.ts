import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { submitResolutionProof } from "@/lib/workorders";
import { serverCache } from "@/lib/cache";

export async function POST(req: Request) {
  try {
    const session = getUserFromRequest(req);
    if (!session || (session.role !== "WARD_OFFICER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Ward Officer or Admin role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      issueId,
      afterPhotoUrl,
      resolutionLat,
      resolutionLng,
      notes,
      contractorName,
    } = body;

    if (!issueId || !afterPhotoUrl || resolutionLat === undefined || resolutionLng === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: issueId, afterPhotoUrl, resolutionLat, resolutionLng." },
        { status: 400 }
      );
    }

    const result = await submitResolutionProof({
      issueId,
      officerId: session.userId,
      afterPhotoUrl,
      resolutionLat: parseFloat(resolutionLat),
      resolutionLng: parseFloat(resolutionLng),
      notes: notes || "Repair successfully executed on site.",
      contractorName: contractorName || "Municipal Ward Repair Crew",
    });

    // Invalidate caches
    await serverCache.expireTags(["issues", "analytics", "map", "contractors", "wards", "workorders", `issue:${issueId}`]);

    return NextResponse.json({
      success: true,
      result,
      message: `Resolution proof uploaded and geofence verified (${result.distanceMeters}m). Status is now PROVISIONALLY RESOLVED with 72h community verification window.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to submit resolution proof." },
      { status: 400 }
    );
  }
}

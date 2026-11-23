import { NextResponse } from "next/server";
import { findDuplicateCandidates } from "@/lib/dedup";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const categoryCode = searchParams.get("categoryCode") || undefined;
    const radiusStr = searchParams.get("radius");

    if (!latStr || !lngStr) {
      return NextResponse.json(
        { error: "Latitude ('lat') and Longitude ('lng') parameters are required." },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radius = radiusStr ? parseFloat(radiusStr) : 60; // 60 meters default search radius

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Invalid coordinate values provided." },
        { status: 400 }
      );
    }

    const duplicates = await findDuplicateCandidates(lat, lng, categoryCode, radius);

    return NextResponse.json({
      query: { lat, lng, categoryCode, radiusMeters: radius },
      foundDuplicateCount: duplicates.length,
      hasPotentialDuplicates: duplicates.length > 0,
      candidates: duplicates,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

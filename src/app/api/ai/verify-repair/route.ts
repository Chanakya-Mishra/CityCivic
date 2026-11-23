import { NextResponse } from "next/server";
import { verifyRepairImages } from "@/lib/aiVision";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { beforePhotoUrl, afterPhotoUrl, categoryCode = "POTHOLE" } = body;

    if (!beforePhotoUrl || !afterPhotoUrl) {
      return NextResponse.json(
        { error: "Both beforePhotoUrl and afterPhotoUrl are required." },
        { status: 400 }
      );
    }

    const result = await verifyRepairImages(beforePhotoUrl, afterPhotoUrl, categoryCode);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

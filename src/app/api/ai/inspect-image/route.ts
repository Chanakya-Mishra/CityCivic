import { NextResponse } from "next/server";
import { inspectComplaintImage } from "@/lib/aiVision";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { photoUrl, reportedCategory } = body;

    if (!photoUrl) {
      return NextResponse.json({ error: "photoUrl is required" }, { status: 400 });
    }

    const result = await inspectComplaintImage(photoUrl, reportedCategory);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

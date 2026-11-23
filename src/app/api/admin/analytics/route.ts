import { NextResponse } from "next/server";
import { getCityAnalytics } from "@/lib/analytics";

export async function GET() {
  try {
    const analytics = await getCityAnalytics();
    return NextResponse.json(analytics);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

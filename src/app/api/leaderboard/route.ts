import { NextResponse } from "next/server";
import { getCivicLeaderboard } from "@/lib/karma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");

    const leaderboard = await getCivicLeaderboard(wardId, limit);
    return NextResponse.json({ leaderboard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

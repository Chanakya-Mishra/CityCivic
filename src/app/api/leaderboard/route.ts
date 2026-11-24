import { NextResponse } from "next/server";
import { getCivicLeaderboard } from "@/lib/karma";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "20");

    const cacheKey = `leaderboard:${wardId}:${limit}`;

    const leaderboard = await serverCache.remember(
      cacheKey,
      30, // 30s cache
      () => getCivicLeaderboard(wardId === "ALL" ? undefined : wardId, limit),
      ["leaderboard"]
    );

    return NextResponse.json(
      { leaderboard },
      { headers: cacheHeaders(30, 120) }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

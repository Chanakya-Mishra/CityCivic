import { NextResponse } from "next/server";
import { getContractorScorecards } from "@/lib/contractors";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET() {
  try {
    const scorecards = await serverCache.remember(
      "contractors:scorecards",
      60, // 60s cache
      () => getContractorScorecards(),
      ["contractors"]
    );

    return NextResponse.json(
      { scorecards },
      { headers: cacheHeaders(30, 120) }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

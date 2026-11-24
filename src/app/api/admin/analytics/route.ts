import { NextResponse } from "next/server";
import { getCityAnalytics } from "@/lib/analytics";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET() {
  try {
    const analytics = await serverCache.remember(
      "analytics:summary",
      60, // 60s server-side cache
      () => getCityAnalytics(),
      ["analytics", "issues"]
    );

    return NextResponse.json(analytics, {
      headers: cacheHeaders(30, 120), // 30s CDN edge cache
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET() {
  const categories = await serverCache.remember(
    "categories:all",
    3600, // 1 hour server-side cache
    () =>
      prisma.category.findMany({
        orderBy: { baseHazard: "desc" },
      }),
    ["categories"]
  );

  return NextResponse.json(
    { categories },
    { headers: cacheHeaders(600, 86400) } // 10 min CDN edge cache, 24h stale-while-revalidate
  );
}

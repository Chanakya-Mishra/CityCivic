import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET() {
  const wards = await serverCache.remember(
    "wards:all",
    1800, // 30 min server-side cache
    () =>
      prisma.ward.findMany({
        orderBy: { code: "asc" },
        include: {
          _count: {
            select: {
              issues: true,
              workOrders: true,
            },
          },
        },
      }),
    ["wards"]
  );

  return NextResponse.json(
    { wards },
    { headers: cacheHeaders(300, 3600) } // 5 min CDN edge cache
  );
}

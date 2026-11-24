import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "30"));

    const logs = await serverCache.remember(
      `audit:ledger:${limit}`,
      30, // 30s cache
      () =>
        prisma.auditLog.findMany({
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            issue: {
              select: {
                id: true,
                trackingCode: true,
                title: true,
                status: true,
                ward: { select: { name: true, code: true } },
                category: { select: { name: true, department: true } },
              },
            },
          },
        }),
      ["audit", "issues"]
    );

    return NextResponse.json(
      { logs },
      { headers: cacheHeaders(15, 60) }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

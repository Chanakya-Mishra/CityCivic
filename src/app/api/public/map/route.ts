import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || "ALL";
    const categoryCode = searchParams.get("categoryCode") || "ALL";
    const status = searchParams.get("status") || "ALL";

    const cacheKey = `map:${wardId}:${categoryCode}:${status}`;

    const data = await serverCache.remember(
      cacheKey,
      30, // 30s server cache
      async () => {
        const where: any = { isMaster: true };
        if (wardId !== "ALL") where.wardId = wardId;
        if (categoryCode !== "ALL") where.categoryCode = categoryCode;
        if (status !== "ALL") where.status = status;

        const [issues, wards] = await Promise.all([
          prisma.issue.findMany({
            where,
            include: {
              category: true,
              ward: true,
              resolutionProof: true,
              _count: {
                select: {
                  childIssues: true,
                  upvotes: true,
                  verifications: true,
                  disputes: true,
                },
              },
            },
            orderBy: [{ dynamicSeverity: "desc" }, { createdAt: "desc" }],
          }),
          prisma.ward.findMany({
            include: {
              _count: {
                select: { issues: true },
              },
            },
          }),
        ]);

        // Format for Leaflet map markers
        const markers = issues.map((issue) => {
          let color = "#ef4444"; // red default (OPEN)
          if (issue.status === "OFFICIALLY_RESOLVED") {
            color = "#10b981"; // green
          } else if (issue.status === "PROVISIONALLY_RESOLVED") {
            color = "#06b6d4"; // cyan / provisional
          } else if (issue.status === "IN_PROGRESS" || issue.status === "TRIAGED") {
            color = "#f59e0b"; // amber / in progress
          } else if (issue.status === "REOPENED_DISPUTED") {
            color = "#dc2626"; // dark red / disputed hazard
          }

          return {
            id: issue.id,
            trackingCode: issue.trackingCode,
            title: issue.title,
            description: issue.description,
            status: issue.status,
            category: issue.category.name,
            categoryCode: issue.category.code,
            department: issue.category.department,
            latitude: issue.latitude,
            longitude: issue.longitude,
            address: issue.address,
            photoUrl: issue.photoUrl,
            afterPhotoUrl: issue.resolutionProof?.afterPhotoUrl || null,
            dynamicSeverity: issue.dynamicSeverity,
            severityLevel: issue.severityLevel,
            upvoteCount: issue.upvoteCount,
            childIssueCount: issue._count.childIssues,
            wardName: issue.ward?.name || "Unassigned",
            markerColor: color,
            disputeDeadline: issue.disputeDeadline,
            createdAt: issue.createdAt,
          };
        });

        return { markers, wards, totalCount: markers.length };
      },
      ["issues", "wards", "map"]
    );

    return NextResponse.json(data, {
      headers: cacheHeaders(15, 60), // 15s CDN edge cache
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

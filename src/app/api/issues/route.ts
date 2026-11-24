import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createCivicIssue } from "@/lib/dedup";
import { serverCache, cacheHeaders } from "@/lib/cache";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || "ALL";
    const status = searchParams.get("status") || "ALL";
    const categoryCode = searchParams.get("categoryCode") || "ALL";
    const masterOnly = searchParams.get("masterOnly") !== "false";
    const search = searchParams.get("search") || "";

    const cacheKey = `issues:feed:${wardId}:${status}:${categoryCode}:${masterOnly}:${search}`;

    const data = await serverCache.remember(
      cacheKey,
      20, // 20s server cache
      async () => {
        const where: any = {};

        if (wardId !== "ALL") where.wardId = wardId;
        if (status !== "ALL") where.status = status;
        if (categoryCode !== "ALL") where.categoryCode = categoryCode;
        if (masterOnly) where.isMaster = true;
        if (search) {
          where.OR = [
            { title: { contains: search } },
            { trackingCode: { contains: search } },
            { address: { contains: search } },
          ];
        }

        const issues = await prisma.issue.findMany({
          where,
          include: {
            category: true,
            ward: true,
            reportedBy: { select: { id: true, name: true, karma: true } },
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
          orderBy: [
            { dynamicSeverity: "desc" },
            { createdAt: "desc" },
          ],
        });

        return { issues, count: issues.length };
      },
      ["issues"]
    );

    return NextResponse.json(data, {
      headers: cacheHeaders(10, 30),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required. Please verify via Email OTP." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      categoryCode,
      latitude,
      longitude,
      address,
      photoUrl,
      linkedMasterId,
    } = body;

    if (!title || !categoryCode || latitude === undefined || longitude === undefined || !photoUrl) {
      return NextResponse.json(
        { error: "Missing required fields: title, categoryCode, latitude, longitude, photoUrl." },
        { status: 400 }
      );
    }

    const issue = await createCivicIssue({
      title,
      description: description || "No detailed description provided.",
      categoryCode,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address: address || "Location identified by GPS",
      photoUrl,
      reportedById: session.userId,
      linkedMasterId: linkedMasterId || null,
    });

    return NextResponse.json({
      success: true,
      issue,
      message: issue.isMaster
        ? `Master incident ${issue.trackingCode} logged successfully.`
        : `Corroborating report ${issue.trackingCode} linked to master incident.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

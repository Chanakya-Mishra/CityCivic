import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ id }, { trackingCode: id }],
      },
      include: {
        category: true,
        ward: true,
        reportedBy: {
          select: { id: true, name: true, email: true, phone: true, karma: true },
        },
        childIssues: {
          include: {
            reportedBy: { select: { id: true, name: true } },
          },
        },
        masterIssue: true,
        upvotes: {
          include: {
            user: { select: { id: true, name: true, karma: true } },
          },
        },
        verifications: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        resolutionProof: {
          include: {
            officer: { select: { id: true, name: true, role: true } },
          },
        },
        disputes: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        workOrders: {
          include: {
            assignedOfficer: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }

    return NextResponse.json({ issue });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

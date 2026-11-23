import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createWorkOrder } from "@/lib/workorders";

export async function GET(req: Request) {
  try {
    const session = getUserFromRequest(req);
    if (!session || (session.role !== "WARD_OFFICER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Ward Officer or Admin role required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || session.wardId;

    const where: any = {};
    if (wardId) where.wardId = wardId;

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        issue: {
          include: {
            category: true,
            reportedBy: { select: { name: true, phone: true } },
          },
        },
        ward: true,
        assignedOfficer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ workOrders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getUserFromRequest(req);
    if (!session || (session.role !== "WARD_OFFICER" && session.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Ward Officer or Admin role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { issueId, department, priority, notes, scheduledDate } = body;

    if (!issueId || !department) {
      return NextResponse.json(
        { error: "Missing required fields: issueId and department." },
        { status: 400 }
      );
    }

    const workOrder = await createWorkOrder({
      issueId,
      assignedOfficerId: session.userId,
      department,
      priority,
      notes,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      workOrder,
      message: `Work order ${workOrder.workOrderCode} successfully dispatched.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

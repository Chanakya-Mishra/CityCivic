import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { exportWorkOrdersCsv } from "@/lib/contractors";

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

    // WARD_OFFICER is strictly scoped to their assigned ward; only ADMIN may export all or arbitrary wards
    let targetWardId: string | undefined = undefined;
    if (session.role === "WARD_OFFICER") {
      if (!session.wardId) {
        return NextResponse.json(
          { error: "Ward Officer account has no assigned municipal ward." },
          { status: 403 }
        );
      }
      targetWardId = session.wardId;
    } else if (session.role === "ADMIN") {
      targetWardId = searchParams.get("wardId") || undefined;
    }

    const csvContent = await exportWorkOrdersCsv(targetWardId);

    const filename = `CityCivic-WorkOrders-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

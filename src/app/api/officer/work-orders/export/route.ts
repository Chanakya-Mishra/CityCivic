import { NextResponse } from "next/server";
import { exportWorkOrdersCsv } from "@/lib/contractors";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wardId = searchParams.get("wardId") || undefined;

    const csvContent = await exportWorkOrdersCsv(wardId);

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

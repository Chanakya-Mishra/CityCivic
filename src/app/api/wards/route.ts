import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const wards = await prisma.ward.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: {
          issues: true,
          workOrders: true,
        },
      },
    },
  });
  return NextResponse.json({ wards });
}

import { NextResponse } from "next/server";
import { getContractorScorecards } from "@/lib/contractors";

export async function GET() {
  try {
    const scorecards = await getContractorScorecards();
    return NextResponse.json({ scorecards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

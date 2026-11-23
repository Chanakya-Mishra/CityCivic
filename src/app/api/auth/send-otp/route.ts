import { NextResponse } from "next/server";
import { createAndSendOtp } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, phone } = body;

    if (!email || !phone) {
      return NextResponse.json(
        { error: "Both email address and phone number are required." },
        { status: 400 }
      );
    }

    const result = await createAndSendOtp(email, phone);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to dispatch verification code." },
      { status: 400 }
    );
  }
}

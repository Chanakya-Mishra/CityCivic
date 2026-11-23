import { NextResponse } from "next/server";
import { verifyOtpCode } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code, name } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 }
      );
    }

    const { user, token } = await verifyOtpCode(email, code, name);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: "Successfully verified and signed in.",
    });

    // Set HttpOnly session cookie
    response.cookies.set("citycivic_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to verify code." },
      { status: 400 }
    );
  }
}

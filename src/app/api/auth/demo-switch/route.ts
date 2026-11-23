import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signUserToken, UserSessionPayload } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role = "CITIZEN" } = body;

    let targetEmail = "citizen.demo@gmail.com";
    if (role === "WARD_OFFICER") {
      targetEmail = "officer.indiranagar@citycivic.gov";
    } else if (role === "ADMIN") {
      targetEmail = "admin@citycivic.gov";
    }

    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: { ward: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with role ${role} not found in database.` },
        { status: 404 }
      );
    }

    const payload: UserSessionPayload = {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      wardId: user.wardId,
    };

    const token = signUserToken(payload);

    const response = NextResponse.json({
      success: true,
      user,
      token,
      message: `Switched active session to ${user.name} (${user.role})`,
    });

    response.cookies.set("citycivic_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

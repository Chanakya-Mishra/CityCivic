import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signUserToken, UserSessionPayload, getOfficerPassword, getAdminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { role = "CITIZEN", password } = body;

    const OFFICER_PASSWORD = getOfficerPassword();
    const ADMIN_PASSWORD = getAdminPassword();

    // Security Gate: Switching to governing roles requires municipal credentials
    if (role === "WARD_OFFICER" || role === "ADMIN") {
      const expected = role === "ADMIN" ? ADMIN_PASSWORD : OFFICER_PASSWORD;
      if (password !== expected && password !== ADMIN_PASSWORD) {
        return NextResponse.json(
          {
            error:
              "Access denied: Municipal authorization password is required to assume Ward Officer or Admin governance roles.",
          },
          { status: 403 }
        );
      }
    }

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

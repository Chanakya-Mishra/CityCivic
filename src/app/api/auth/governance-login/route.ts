import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { signUserToken, UserSessionPayload, getOfficerPassword, getAdminPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, role } = body;

    const OFFICER_PASSWORD = getOfficerPassword();
    const ADMIN_PASSWORD = getAdminPassword();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Government email address and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find user in DB
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { ward: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No municipal account found with this government email address." },
        { status: 404 }
      );
    }

    // 2. Validate role matches governing authorization
    if (user.role !== "WARD_OFFICER" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied. This account does not possess municipal governance privileges." },
        { status: 403 }
      );
    }

    if (role && user.role !== role && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: `Insufficient permissions for requested ${role} portal.` },
        { status: 403 }
      );
    }

    // 3. Validate password
    const expectedPassword = user.role === "ADMIN" ? ADMIN_PASSWORD : OFFICER_PASSWORD;
    if (password !== expectedPassword && password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "Invalid municipal authorization credentials. Access denied." },
        { status: 401 }
      );
    }

    // 4. Generate signed session
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
      message: `Municipal officer authenticated: ${user.name} (${user.role})`,
    });

    // Set secure HTTP-only cookie
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

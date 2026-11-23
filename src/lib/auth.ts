import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || "citycivic-secure-jwt-dev-secret-key-2026";

// Known disposable email domains to prevent spam
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com",
  "10minutemail.com",
  "mailinator.com",
  "guerrillamail.com",
  "sharklasers.com",
  "throwawaymail.com",
  "yopmail.com",
  "getnada.com",
  "dispostable.com",
  "trashmail.com",
  "fakeinbox.com",
  "burnermail.io",
]);

export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes("@")) return true;
  const domain = email.split("@")[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

export function validatePhoneNumber(phone: string): { valid: boolean; error?: string; cleanPhone?: string } {
  if (!phone) {
    return { valid: false, error: "Phone number is required for ward officer dispatch records." };
  }

  // Remove spaces, dashes, parentheses
  const clean = phone.replace(/[\s\-\(\)]/g, "");

  // Check dummy repeating patterns (e.g., 9999999999, 1234567890)
  if (/^(\d)\1{7,}$/.test(clean.replace(/^\+/, ""))) {
    return { valid: false, error: "Please provide a valid active phone number, repeating digits are rejected." };
  }
  if (clean.includes("123456789") || clean.includes("987654321")) {
    return { valid: false, error: "Please enter a valid personal contact number." };
  }

  // Check standard international / national length (between 10 and 15 digits)
  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { valid: false, error: "Phone number must be between 10 and 15 digits." };
  }

  return { valid: true, cleanPhone: clean };
}

export function generateOtp(): string {
  // Cryptographically secure 6-digit random code
  return crypto.randomInt(100000, 999999).toString();
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  phone: string;
  role: string;
  wardId?: string | null;
  name?: string | null;
}

export function signUserToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "90d" });
}

export function verifyUserToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload;
  } catch {
    return null;
  }
}

export function getUserFromRequest(req: Request): UserSessionPayload | null {
  // Check Authorization Header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const user = verifyUserToken(token);
    if (user) return user;
  }

  // Check Cookie Header
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, v] = c.trim().split("=");
        return [k, decodeURIComponent(v || "")];
      })
    );
    if (cookies.citycivic_token) {
      return verifyUserToken(cookies.citycivic_token);
    }
  }

  return null;
}

export async function createAndSendOtp(email: string, phone: string): Promise<{ success: boolean; devCode?: string; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  if (isDisposableEmail(normalizedEmail)) {
    throw new Error("Temporary or disposable email addresses are blocked to prevent civic spam.");
  }

  const phoneCheck = validatePhoneNumber(phone);
  if (!phoneCheck.valid) {
    throw new Error(phoneCheck.error || "Invalid phone number format.");
  }

  // Rate limit: Check if more than 3 active OTPs requested in last 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentRequests = await prisma.otpCode.count({
    where: {
      email: normalizedEmail,
      createdAt: { gte: tenMinutesAgo },
    },
  });

  if (recentRequests >= 4) {
    throw new Error("Too many verification attempts. Please wait 10 minutes before requesting again.");
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes valid

  await prisma.otpCode.create({
    data: {
      email: normalizedEmail,
      phone: phoneCheck.cleanPhone,
      code,
      expiresAt,
    },
  });

  console.log(`\n======================================================`);
  console.log(`📧 [EMAIL OTP DISPATCH] -> To: ${normalizedEmail}`);
  console.log(`🔐 CODE: ${code} (Valid for 10 minutes)`);
  console.log(`📱 Recorded Contact Phone: ${phoneCheck.cleanPhone}`);
  console.log(`======================================================\n`);

  return {
    success: true,
    devCode: process.env.NODE_ENV !== "production" ? code : undefined,
    message: `Verification code sent to ${normalizedEmail}. Check your inbox!`,
  };
}

export async function verifyOtpCode(
  email: string,
  code: string,
  name?: string
): Promise<{ user: UserSessionPayload; token: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find valid unexpired OTP
  const otpRecord = await prisma.otpCode.findFirst({
    where: {
      email: normalizedEmail,
      code: code.trim(),
      used: false,
      expiresAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) {
    throw new Error("Invalid or expired verification code. Please request a new one.");
  }

  // Mark as used
  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: otpRecord.phone || "+919999999999",
        name: name || normalizedEmail.split("@")[0],
        role: "CITIZEN",
      },
    });
  } else if (otpRecord.phone && user.phone !== otpRecord.phone) {
    // Update phone if user provided an updated one
    user = await prisma.user.update({
      where: { id: user.id },
      data: { phone: otpRecord.phone },
    });
  }

  const sessionPayload: UserSessionPayload = {
    userId: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    wardId: user.wardId,
    name: user.name,
  };

  const token = signUserToken(sessionPayload);
  return { user: sessionPayload, token };
}

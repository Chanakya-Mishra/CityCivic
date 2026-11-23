import prisma from "./prisma";

export interface CitizenLeaderboardEntry {
  id: string;
  name: string;
  email: string;
  phoneMasked: string;
  karma: number;
  badge: {
    title: string;
    level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
    color: string;
  };
  totalReports: number;
  totalVerifications: number;
  totalUpvotes: number;
  wardName: string;
}

export function computeBadgeTier(karma: number): CitizenLeaderboardEntry["badge"] {
  if (karma >= 100) {
    return { title: "Civic Guardian", level: "PLATINUM", color: "#8b5cf6" };
  } else if (karma >= 50) {
    return { title: "Senior Auditor", level: "GOLD", color: "#f59e0b" };
  } else if (karma >= 25) {
    return { title: "Active Watchdog", level: "SILVER", color: "#64748b" };
  }
  return { title: "Verified Neighbor", level: "BRONZE", color: "#10b981" };
}

export async function getCivicLeaderboard(
  wardId?: string,
  limit: number = 20
): Promise<CitizenLeaderboardEntry[]> {
  const where: any = { role: "CITIZEN" };
  if (wardId) where.wardId = wardId;

  const citizens = await prisma.user.findMany({
    where,
    include: {
      ward: true,
      _count: {
        select: {
          issues: true,
          verifications: true,
          upvotes: true,
        },
      },
    },
    orderBy: { karma: "desc" },
    take: limit,
  });

  return citizens.map((c) => {
    // Mask phone e.g. +91 98450 XXXXX
    const rawPhone = c.phone || "";
    const maskedPhone =
      rawPhone.length >= 8
        ? rawPhone.slice(0, rawPhone.length - 5) + "XXXXX"
        : "Verified Phone";

    return {
      id: c.id,
      name: c.name || c.email.split("@")[0],
      email: c.email,
      phoneMasked: maskedPhone,
      karma: c.karma,
      badge: computeBadgeTier(c.karma),
      totalReports: c._count.issues,
      totalVerifications: c._count.verifications,
      totalUpvotes: c._count.upvotes,
      wardName: c.ward?.name || "Bengaluru Metro",
    };
  });
}

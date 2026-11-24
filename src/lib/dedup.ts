import prisma from "./prisma";
import { calculateDistanceMeters, findMatchingWard } from "./geo";
import { serverCache } from "./cache";

export interface DuplicateCandidate {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  categoryCode: string;
  status: string;
  latitude: number;
  longitude: number;
  photoUrl: string;
  distanceMeters: number;
  upvoteCount: number;
  similarityScore: number; // 0 - 100
  isMaster: boolean;
  createdAt: Date;
}

/**
 * Searches for active civic complaints in proximity to intercept duplicate submissions
 */
export async function findDuplicateCandidates(
  lat: number,
  lng: number,
  categoryCode?: string,
  radiusMeters: number = 60
): Promise<DuplicateCandidate[]> {
  // Query all active issues that are master tickets or standalone
  const activeIssues = await prisma.issue.findMany({
    where: {
      status: { in: ["OPEN", "TRIAGED", "IN_PROGRESS", "REOPENED_DISPUTED"] },
      isMaster: true,
    },
    include: {
      category: true,
      _count: { select: { childIssues: true, upvotes: true } },
    },
  });

  const candidates: DuplicateCandidate[] = [];

  for (const issue of activeIssues) {
    const dist = calculateDistanceMeters(lat, lng, issue.latitude, issue.longitude);

    if (dist <= radiusMeters) {
      let score = 0;

      // 1. Proximity score (0 to 40 pts)
      const proximityFraction = Math.max(0, (radiusMeters - dist) / radiusMeters);
      score += Math.round(proximityFraction * 40);

      // 2. Category match (0 or 40 pts)
      if (categoryCode && issue.categoryCode === categoryCode) {
        score += 40;
      } else if (!categoryCode) {
        score += 20;
      }

      // 3. Time recency bonus (0 to 20 pts)
      const ageHours = (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 20;
      } else if (ageHours < 72) {
        score += 10;
      }

      candidates.push({
        id: issue.id,
        trackingCode: issue.trackingCode,
        title: issue.title,
        description: issue.description,
        categoryCode: issue.categoryCode,
        status: issue.status,
        latitude: issue.latitude,
        longitude: issue.longitude,
        photoUrl: issue.photoUrl,
        distanceMeters: dist,
        upvoteCount: issue.upvoteCount,
        similarityScore: Math.min(100, score),
        isMaster: issue.isMaster,
        createdAt: issue.createdAt,
      });
    }
  }

  // Sort by highest similarity score first, then closest distance
  candidates.sort((a, b) => b.similarityScore - a.similarityScore || a.distanceMeters - b.distanceMeters);

  return candidates;
}

export function generateTrackingCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CC-${year}-${rand}`;
}

export interface CreateIssueInput {
  title: string;
  description: string;
  categoryCode: string;
  latitude: number;
  longitude: number;
  address?: string;
  photoUrl: string;
  reportedById: string;
  linkedMasterId?: string | null;
}

export async function createCivicIssue(input: CreateIssueInput) {
  // 1. Find assigned ward
  const wards = await prisma.ward.findMany();
  const matchingWard = findMatchingWard(input.latitude, input.longitude, wards);

  // 2. Resolve and normalize Category against DB records to guarantee Foreign Key integrity
  let allCategories = await prisma.category.findMany();
  if (allCategories.length === 0) {
    await prisma.category.createMany({
      data: [
        { code: "POTHOLE", name: "Pothole & Road Damage", department: "Roads & Infrastructure", baseHazard: 7 },
        { code: "MANHOLE", name: "Open / Broken Manhole", department: "Sanitation & Drainage", baseHazard: 9 },
        { code: "WATER_LEAK", name: "Water Main Burst / Leak", department: "Water Supply & Sewerage", baseHazard: 6 },
        { code: "GARBAGE", name: "Illegal Waste / Garbage Dump", department: "Solid Waste Management", baseHazard: 4 },
        { code: "STREETLIGHT", name: "Streetlight Outage / Dark Spot", department: "Electrical Works", baseHazard: 5 },
        { code: "SEWAGE", name: "Sewage Overflow / Contamination", department: "Sanitation & Drainage", baseHazard: 8 },
      ],
      skipDuplicates: true,
    });
    allCategories = await prisma.category.findMany();
  }

  const rawCode = (input.categoryCode || "").trim().toUpperCase();
  let matchedCategory = allCategories.find((c) => c.code.toUpperCase() === rawCode);

  if (!matchedCategory) {
    if (rawCode.includes("ROAD") || rawCode.includes("HOLE") || rawCode.includes("ASPHALT") || rawCode.includes("PAVEMENT")) {
      matchedCategory = allCategories.find((c) => c.code === "POTHOLE");
    } else if (rawCode.includes("GARBAGE") || rawCode.includes("WASTE") || rawCode.includes("TRASH")) {
      matchedCategory = allCategories.find((c) => c.code === "GARBAGE");
    } else if (rawCode.includes("MANHOLE") || rawCode.includes("DRAIN") || rawCode.includes("PIT")) {
      matchedCategory = allCategories.find((c) => c.code === "MANHOLE");
    } else if (rawCode.includes("LIGHT") || rawCode.includes("LAMP") || rawCode.includes("DARK")) {
      matchedCategory = allCategories.find((c) => c.code === "STREETLIGHT");
    } else if (rawCode.includes("WATER") || rawCode.includes("PIPE") || rawCode.includes("LEAK")) {
      matchedCategory = allCategories.find((c) => c.code === "WATER_LEAK");
    } else if (rawCode.includes("SEWAGE") || rawCode.includes("SEWER")) {
      matchedCategory = allCategories.find((c) => c.code === "SEWAGE");
    } else {
      matchedCategory = allCategories[0];
    }
  }

  const validCategoryCode = matchedCategory ? matchedCategory.code : "POTHOLE";
  const baseHazard = matchedCategory?.baseHazard || 5;
  const isMaster = !input.linkedMasterId;

  // 3. Create unique tracking code
  let trackingCode = generateTrackingCode();
  let existing = await prisma.issue.findUnique({ where: { trackingCode } });
  while (existing) {
    trackingCode = generateTrackingCode();
    existing = await prisma.issue.findUnique({ where: { trackingCode } });
  }

  // 4. Create Issue in DB
  const issue = await prisma.issue.create({
    data: {
      trackingCode,
      title: input.title,
      description: input.description,
      categoryCode: validCategoryCode,
      status: "OPEN",
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address,
      photoUrl: input.photoUrl,
      isMaster,
      masterIssueId: input.linkedMasterId || null,
      wardId: matchingWard?.id || null,
      reportedById: input.reportedById,
      dynamicSeverity: baseHazard,
      severityLevel: baseHazard >= 8 ? "CRITICAL" : baseHazard >= 6 ? "HIGH" : baseHazard >= 4 ? "MEDIUM" : "LOW",
      upvoteCount: 1,
    },
    include: {
      category: true,
      ward: true,
      reportedBy: { select: { id: true, name: true, email: true, phone: true } },
    },
  });

  // Automatically register creator's upvote
  await prisma.upvote.create({
    data: {
      issueId: issue.id,
      userId: input.reportedById,
      userLat: input.latitude,
      userLng: input.longitude,
    },
  });

  // Log Audit
  await prisma.auditLog.create({
    data: {
      issueId: issue.id,
      action: isMaster ? "MASTER_ISSUE_REPORTED" : "GROUPED_AS_CHILD_COMPLAINT",
      actorId: input.reportedById,
      actorRole: "CITIZEN",
      details: isMaster
        ? `New incident reported at (${input.latitude.toFixed(5)}, ${input.longitude.toFixed(5)}) in ${matchingWard?.name || "Unassigned"}`
        : `Grouped under master issue ${input.linkedMasterId}`,
    },
  });

  // If this is a child ticket, increment master ticket upvote count and recalculate
  if (input.linkedMasterId) {
    await prisma.issue.update({
      where: { id: input.linkedMasterId },
      data: {
        upvoteCount: { increment: 1 },
      },
    });

    await prisma.auditLog.create({
      data: {
        issueId: input.linkedMasterId,
        action: "CHILD_REPORT_ATTACHED",
        actorId: input.reportedById,
        actorRole: "CITIZEN",
        details: `Corroborating child complaint ${trackingCode} attached by citizen.`,
      },
    });
  }

  // Purge server-side cache for map markers, analytics, and issue listings
  await serverCache.expireTags(["issues", "analytics", "map", "wards", "audit"]);

  return issue;
}

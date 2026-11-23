import prisma from "./prisma";

export interface SeverityCalculationResult {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  breakdown: {
    baseHazard: number;
    upvoteBoost: number;
    verificationBoost: number;
    slaAgingBoost: number;
  };
}

/**
 * Computes the multi-factor Dynamic Severity Index (DSI) for an issue
 */
export async function calculateDynamicSeverity(issueId: string): Promise<SeverityCalculationResult> {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      category: true,
      upvotes: true,
      verifications: true,
      childIssues: true,
    },
  });

  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }

  // 1. Base Hazard Weight (from category, 1 - 10)
  const baseHazard = issue.category?.baseHazard || 5;

  // 2. Upvote Boost: Total unique upvotes (including child complaints)
  // Uses log2 to scale smoothly: 1 upvote -> 1.0, 3 upvotes -> 2.0, 7 upvotes -> 3.0, 15 upvotes -> 4.0
  const totalUpvotes = Math.max(1, issue.upvoteCount + issue.childIssues.length);
  const upvoteBoost = Math.round(Math.log2(totalUpvotes + 1) * 1.5 * 10) / 10;

  // 3. Community Verification Boost
  let verificationBoost = 0;
  if (issue.verifications.length > 0) {
    const stillPresentCount = issue.verifications.filter((v) => v.isStillPresent).length;
    const severeCount = issue.verifications.filter((v) => v.hazardPerception === "SEVERE").length;
    const moderateCount = issue.verifications.filter((v) => v.hazardPerception === "MODERATE").length;

    // +0.5 per still-present confirmation (up to 2.5 pts)
    verificationBoost += Math.min(2.5, stillPresentCount * 0.5);
    // +0.8 per severe hazard perception (up to 3.0 pts)
    verificationBoost += Math.min(3.0, severeCount * 0.8 + moderateCount * 0.3);
  }
  verificationBoost = Math.round(verificationBoost * 10) / 10;

  // 4. SLA Aging Penalty (0.5 pts per 24 hours unaddressed, max 3.0 pts)
  const ageHours = (Date.now() - new Date(issue.createdAt).getTime()) / (1000 * 60 * 60);
  const slaAgingBoost = Math.min(3.0, Math.round((ageHours / 24) * 0.5 * 10) / 10);

  // Total Score
  const totalScore = Math.round((baseHazard + upvoteBoost + verificationBoost + slaAgingBoost) * 10) / 10;

  // Severity Level Tier
  let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
  if (totalScore >= 12.0) {
    level = "CRITICAL";
  } else if (totalScore >= 8.5) {
    level = "HIGH";
  } else if (totalScore >= 5.0) {
    level = "MEDIUM";
  } else {
    level = "LOW";
  }

  // Update in DB
  await prisma.issue.update({
    where: { id: issueId },
    data: {
      dynamicSeverity: totalScore,
      severityLevel: level,
    },
  });

  return {
    score: totalScore,
    level,
    breakdown: {
      baseHazard,
      upvoteBoost,
      verificationBoost,
      slaAgingBoost,
    },
  };
}

/**
 * Handle citizen upvoting an issue (with anti-duplicate 1-vote constraint)
 */
export async function upvoteIssue(issueId: string, userId: string, userLat?: number, userLng?: number) {
  // Check if already upvoted
  const existing = await prisma.upvote.findUnique({
    where: {
      issueId_userId: { issueId, userId },
    },
  });

  if (existing) {
    throw new Error("You have already upvoted this civic issue.");
  }

  // Record upvote
  await prisma.upvote.create({
    data: {
      issueId,
      userId,
      userLat,
      userLng,
    },
  });

  // Increment upvote count on issue
  const updatedIssue = await prisma.issue.update({
    where: { id: issueId },
    data: {
      upvoteCount: { increment: 1 },
    },
  });

  // Recalculate dynamic severity score
  const severityResult = await calculateDynamicSeverity(issueId);

  // If this issue is a child issue, also recalculate master issue
  if (updatedIssue.masterIssueId) {
    await prisma.issue.update({
      where: { id: updatedIssue.masterIssueId },
      data: { upvoteCount: { increment: 1 } },
    });
    await calculateDynamicSeverity(updatedIssue.masterIssueId);
  }

  // Log audit
  await prisma.auditLog.create({
    data: {
      issueId,
      action: "COMMUNITY_UPVOTE",
      actorId: userId,
      actorRole: "CITIZEN",
      details: `Citizen upvoted issue. New severity score: ${severityResult.score} (${severityResult.level})`,
    },
  });

  return {
    success: true,
    upvoteCount: updatedIssue.upvoteCount,
    severity: severityResult,
  };
}

export interface SubmitVerificationInput {
  issueId: string;
  userId: string;
  isStillPresent: boolean;
  hazardPerception: "MILD" | "MODERATE" | "SEVERE";
  userLat?: number;
  userLng?: number;
  comment?: string;
}

/**
 * Handle on-the-ground community verification micro-survey
 */
export async function submitVerification(input: SubmitVerificationInput) {
  const verification = await prisma.verification.create({
    data: {
      issueId: input.issueId,
      userId: input.userId,
      isStillPresent: input.isStillPresent,
      hazardPerception: input.hazardPerception,
      userLat: input.userLat,
      userLng: input.userLng,
      comment: input.comment,
    },
  });

  // Award +5 karma to citizen for contributing on-ground verification
  await prisma.user.update({
    where: { id: input.userId },
    data: { karma: { increment: 5 } },
  });

  // Recalculate dynamic severity
  const severityResult = await calculateDynamicSeverity(input.issueId);

  // Log audit
  await prisma.auditLog.create({
    data: {
      issueId: input.issueId,
      action: "COMMUNITY_VERIFICATION_SUBMITTED",
      actorId: input.userId,
      actorRole: "CITIZEN",
      details: `Ground verification: ${input.isStillPresent ? "Still Active" : "Reported Cleared"}, Hazard Perception: ${input.hazardPerception}. New Severity: ${severityResult.score}`,
    },
  });

  return {
    success: true,
    verification,
    severity: severityResult,
  };
}

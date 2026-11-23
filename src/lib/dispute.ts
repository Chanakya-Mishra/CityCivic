import prisma from "./prisma";
import { calculateDynamicSeverity } from "./severity";

export interface DisputeResolutionInput {
  issueId: string;
  userId: string;
  reason: string;
  evidencePhotoUrl?: string;
}

/**
 * Handle citizen disputing a fake/incomplete resolution ("Still Broken")
 */
export async function disputeResolution(input: DisputeResolutionInput) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
    include: { resolutionProof: true },
  });

  if (!issue) {
    throw new Error(`Issue not found: ${input.issueId}`);
  }

  if (issue.status !== "PROVISIONALLY_RESOLVED" && issue.status !== "OFFICIALLY_RESOLVED") {
    throw new Error(`Cannot dispute issue: Current status is ${issue.status}, not in resolution state.`);
  }

  // 1. Record Dispute
  const dispute = await prisma.dispute.create({
    data: {
      issueId: input.issueId,
      userId: input.userId,
      reason: input.reason,
      evidencePhotoUrl: input.evidencePhotoUrl,
    },
  });

  // 2. Automatically Reopen Issue and mark as REOPENED_DISPUTED
  const updatedIssue = await prisma.issue.update({
    where: { id: input.issueId },
    data: {
      status: "REOPENED_DISPUTED",
      disputeCount: { increment: 1 },
    },
  });

  // Also reopen child issues
  await prisma.issue.updateMany({
    where: { masterIssueId: input.issueId },
    data: {
      status: "REOPENED_DISPUTED",
      disputeCount: { increment: 1 },
    },
  });

  // 3. Recalculate dynamic severity (automatically bumps severity because of community conflict)
  const severityResult = await calculateDynamicSeverity(input.issueId);

  // 4. Record Audit Log
  await prisma.auditLog.create({
    data: {
      issueId: input.issueId,
      action: "RESOLUTION_DISPUTED_BY_COMMUNITY",
      actorId: input.userId,
      actorRole: "CITIZEN",
      details: `Closure contested by resident: "${input.reason}". Reopened as REOPENED_DISPUTED with escalated severity ${severityResult.score}.`,
    },
  });

  return {
    success: true,
    dispute,
    issue: updatedIssue,
    severity: severityResult,
    message: "Dispute registered. Ticket automatically reopened and escalated to zonal supervisor.",
  };
}

/**
 * Citizen confirms the repair was completed satisfactorily
 */
export async function confirmResolution(issueId: string, userId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new Error(`Issue not found: ${issueId}`);
  }

  if (issue.status !== "PROVISIONALLY_RESOLVED") {
    throw new Error(`Cannot confirm resolution: Issue is ${issue.status}, not provisionally resolved.`);
  }

  // Mark as OFFICIALLY_RESOLVED
  const updated = await prisma.issue.update({
    where: { id: issueId },
    data: {
      status: "OFFICIALLY_RESOLVED",
      officiallyResolvedAt: new Date(),
    },
  });

  // Mark child issues as OFFICIALLY_RESOLVED
  await prisma.issue.updateMany({
    where: { masterIssueId: issueId },
    data: {
      status: "OFFICIALLY_RESOLVED",
      officiallyResolvedAt: new Date(),
    },
  });

  // Log Audit
  await prisma.auditLog.create({
    data: {
      issueId,
      action: "OFFICIALLY_RESOLVED",
      actorId: userId,
      actorRole: "CITIZEN",
      details: "Resolution independently verified by local resident. Issue officially archived as solved.",
    },
  });

  return {
    success: true,
    issue: updated,
    message: "Resolution verified! Thank you for auditing your neighborhood.",
  };
}

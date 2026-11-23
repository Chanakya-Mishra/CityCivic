import prisma from "./prisma";
import { calculateDistanceMeters } from "./geo";

export interface CreateWorkOrderInput {
  issueId: string;
  assignedOfficerId: string;
  department: string;
  priority?: "NORMAL" | "HIGH" | "EMERGENCY";
  notes?: string;
  scheduledDate?: Date;
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
  });

  if (!issue) {
    throw new Error(`Issue not found: ${input.issueId}`);
  }

  if (!issue.wardId) {
    throw new Error("Cannot create work order: Issue is not assigned to a ward.");
  }

  const count = await prisma.workOrder.count();
  const year = new Date().getFullYear();
  const workOrderCode = `WO-${year}-${String(count + 1).padStart(4, "0")}`;

  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderCode,
      issueId: input.issueId,
      wardId: issue.wardId,
      assignedOfficerId: input.assignedOfficerId,
      department: input.department,
      priority: input.priority || "NORMAL",
      status: "ASSIGNED",
      notes: input.notes,
      scheduledDate: input.scheduledDate,
    },
    include: {
      ward: true,
      assignedOfficer: { select: { id: true, name: true, phone: true } },
    },
  });

  // Update issue status to TRIAGED or IN_PROGRESS
  await prisma.issue.update({
    where: { id: input.issueId },
    data: { status: "IN_PROGRESS" },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      issueId: input.issueId,
      action: "WORK_ORDER_DISPATCHED",
      actorId: input.assignedOfficerId,
      actorRole: "WARD_OFFICER",
      details: `Work Order ${workOrderCode} issued to ${input.department}. Priority: ${input.priority || "NORMAL"}.`,
    },
  });

  return workOrder;
}

export interface SubmitResolutionProofInput {
  issueId: string;
  officerId: string;
  afterPhotoUrl: string;
  resolutionLat: number;
  resolutionLng: number;
  notes: string;
  contractorName?: string;
  maxDistanceToleranceMeters?: number;
}

/**
 * Validates on-site geofenced resolution proof from ward field team
 */
export async function submitResolutionProof(input: SubmitResolutionProofInput) {
  const issue = await prisma.issue.findUnique({
    where: { id: input.issueId },
  });

  if (!issue) {
    throw new Error(`Issue not found: ${input.issueId}`);
  }

  // Calculate physical distance between where issue was reported and where resolution photo was taken
  const dist = calculateDistanceMeters(
    issue.latitude,
    issue.longitude,
    input.resolutionLat,
    input.resolutionLng
  );

  const tolerance = input.maxDistanceToleranceMeters || 100; // 100 meters tolerance for GPS drift

  if (dist > tolerance) {
    throw new Error(
      `Geofence validation failed: Resolution photo was taken ${dist}m away from the incident site (maximum allowed: ${tolerance}m). Field staff must be on-site.`
    );
  }

  const now = new Date();
  const disputeDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72-hour community verification window

  // Create or update resolution proof
  const proof = await prisma.resolutionProof.upsert({
    where: { issueId: input.issueId },
    update: {
      afterPhotoUrl: input.afterPhotoUrl,
      resolutionLat: input.resolutionLat,
      resolutionLng: input.resolutionLng,
      distanceFromOriginMeters: dist,
      notes: input.notes,
      contractorName: input.contractorName,
      resolvedAt: now,
    },
    create: {
      issueId: input.issueId,
      officerId: input.officerId,
      afterPhotoUrl: input.afterPhotoUrl,
      resolutionLat: input.resolutionLat,
      resolutionLng: input.resolutionLng,
      distanceFromOriginMeters: dist,
      notes: input.notes,
      contractorName: input.contractorName,
      resolvedAt: now,
    },
  });

  // Mark issue as PROVISIONALLY_RESOLVED (Pending 72-hour citizen verification)
  const updatedIssue = await prisma.issue.update({
    where: { id: input.issueId },
    data: {
      status: "PROVISIONALLY_RESOLVED",
      provisionalResolvedAt: now,
      disputeDeadline,
    },
    include: {
      childIssues: true,
    },
  });

  // Update all child complaints as provisionally resolved too
  if (updatedIssue.childIssues.length > 0) {
    await prisma.issue.updateMany({
      where: { masterIssueId: input.issueId },
      data: {
        status: "PROVISIONALLY_RESOLVED",
        provisionalResolvedAt: now,
        disputeDeadline,
      },
    });
  }

  // Update work order if exists
  await prisma.workOrder.updateMany({
    where: { issueId: input.issueId },
    data: { status: "COMPLETED", completedDate: now },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      issueId: input.issueId,
      action: "PROVISIONALLY_RESOLVED",
      actorId: input.officerId,
      actorRole: "WARD_OFFICER",
      details: `Resolution proof uploaded (${dist}m from origin). Status: PROVISIONALLY_RESOLVED with 72h community verification window. Contractor: ${input.contractorName || "In-house Municipal Team"}.`,
    },
  });

  return {
    success: true,
    proof,
    issue: updatedIssue,
    distanceMeters: dist,
    disputeDeadline,
  };
}

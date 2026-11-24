import prisma from "./prisma";

export async function getCityAnalytics() {
  const totalIssues = await prisma.issue.count();
  const masterIssues = await prisma.issue.count({ where: { isMaster: true } });
  const childIssues = await prisma.issue.count({ where: { isMaster: false } });
  const resolvedIssues = await prisma.issue.count({ where: { status: "OFFICIALLY_RESOLVED" } });
  const provisionallyResolved = await prisma.issue.count({ where: { status: "PROVISIONALLY_RESOLVED" } });
  const disputedIssues = await prisma.issue.count({ where: { status: "REOPENED_DISPUTED" } });
  const totalUpvotes = await prisma.upvote.count();
  const totalVerifications = await prisma.verification.count();
  const totalWards = await prisma.ward.count();
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { issues: true } },
    },
  });
  const wards = await prisma.ward.findMany({
    include: {
      issues: {
        select: {
          id: true,
          status: true,
          isMaster: true,
          dynamicSeverity: true,
          createdAt: true,
          officiallyResolvedAt: true,
          disputeCount: true,
        },
      },
    },
  });

  // Deduplication rate: percentage of complaints grouped into master tickets
  const deduplicationRate =
    totalIssues > 0 ? Math.round((childIssues / totalIssues) * 100) : 0;

  // Ward performance scorecards
  const wardPerformance = wards.map((w) => {
    const total = w.issues.length;
    const resolved = w.issues.filter(
      (i) => i.status === "OFFICIALLY_RESOLVED" || i.status === "PROVISIONALLY_RESOLVED"
    ).length;
    const disputed = w.issues.filter((i) => i.status === "REOPENED_DISPUTED").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    // Average turnaround time (hours)
    const resolvedWithTime = w.issues.filter((i) => i.officiallyResolvedAt);
    let avgHours = 0;
    if (resolvedWithTime.length > 0) {
      const totalMs = resolvedWithTime.reduce((acc, curr) => {
        return (
          acc +
          (new Date(curr.officiallyResolvedAt!).getTime() - new Date(curr.createdAt).getTime())
        );
      }, 0);
      avgHours = Math.round(totalMs / (resolvedWithTime.length * 3600 * 1000));
    }

    return {
      wardId: w.id,
      name: w.name,
      code: w.code,
      officerName: w.officerName,
      totalIssues: total,
      resolvedCount: resolved,
      disputedCount: disputed,
      resolutionRate,
      avgResolutionHours: avgHours,
    };
  });

  // Category distribution
  const categoryBreakdown = categories.map((c) => ({
    code: c.code,
    name: c.name,
    department: c.department,
    count: c._count.issues,
    baseHazard: c.baseHazard,
  }));

  return {
    overview: {
      totalComplaintsFiled: totalIssues,
      masterIncidents: masterIssues,
      duplicatesIntercepted: childIssues,
      deduplicationRatePercent: deduplicationRate,
      officiallyResolved: resolvedIssues,
      provisionallyResolved,
      currentlyDisputed: disputedIssues,
      communityUpvotes: totalUpvotes,
      groundVerifications: totalVerifications,
      activeWards: totalWards,
    },
    wardPerformance,
    categoryBreakdown,
  };
}

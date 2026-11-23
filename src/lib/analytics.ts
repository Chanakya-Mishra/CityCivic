import prisma from "./prisma";

export async function getCityAnalytics() {
  const [
    totalIssues,
    masterIssues,
    childIssues,
    resolvedIssues,
    provisionallyResolved,
    disputedIssues,
    totalUpvotes,
    totalVerifications,
    totalWards,
    categories,
    wards,
  ] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { isMaster: true } }),
    prisma.issue.count({ where: { isMaster: false } }),
    prisma.issue.count({ where: { status: "OFFICIALLY_RESOLVED" } }),
    prisma.issue.count({ where: { status: "PROVISIONALLY_RESOLVED" } }),
    prisma.issue.count({ where: { status: "REOPENED_DISPUTED" } }),
    prisma.upvote.count(),
    prisma.verification.count(),
    prisma.ward.count(),
    prisma.category.findMany({
      include: {
        _count: { select: { issues: true } },
      },
    }),
    prisma.ward.findMany({
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
    }),
  ]);

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

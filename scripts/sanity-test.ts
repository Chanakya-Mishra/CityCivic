import { PrismaClient } from "@prisma/client";
import {
  isDisposableEmail,
  validatePhoneNumber,
  createAndSendOtp,
  verifyOtpCode,
  verifyUserToken,
} from "../src/lib/auth";
import { calculateDistanceMeters, findMatchingWard } from "../src/lib/geo";
import { findDuplicateCandidates, createCivicIssue } from "../src/lib/dedup";
import {
  calculateDynamicSeverity,
  upvoteIssue,
  submitVerification,
} from "../src/lib/severity";
import { createWorkOrder, submitResolutionProof } from "../src/lib/workorders";
import { disputeResolution, confirmResolution } from "../src/lib/dispute";
import { getCityAnalytics } from "../src/lib/analytics";

const prisma = new PrismaClient();

async function runSanityCheck() {
  console.log("\n=========================================");
  console.log("🚦 RUNNING CITYCIVIC SANITY TESTS - ALL PHASES 1 - 7");
  console.log("=========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // --- PHASE 1 REGRESSION CHECKS ---
    console.log("🔹 [STAGE 1] Database & Ward Foundation Checks");
    const wards = await prisma.ward.findMany();
    assert(wards.length >= 4, `Database contains ${wards.length} wards`);

    const categories = await prisma.category.findMany();
    assert(categories.length >= 6, `Database contains ${categories.length} categories`);
    const manhole = categories.find((c) => c.code === "MANHOLE");
    assert(manhole !== undefined && manhole.baseHazard === 9, "MANHOLE base hazard is 9");

    const officer = await prisma.user.findUnique({
      where: { email: "officer.indiranagar@citycivic.gov" },
      include: { ward: true },
    });
    assert(officer?.role === "WARD_OFFICER", "Officer has WARD_OFFICER role");
    assert(officer?.ward?.code === "W02", "Officer assigned to Indiranagar (W02)");

    // --- PHASE 2 AUTH & ANTI-SPAM CHECKS ---
    console.log("\n🔹 [STAGE 2] Email OTP & Anti-Spam Security Checks");
    assert(isDisposableEmail("spamuser@mailinator.com") === true, "Identified mailinator.com as disposable");
    assert(validatePhoneNumber("9999999999").valid === false, "Rejected repeating dummy phone 9999999999");

    const testEmail = `test.resident.${Date.now()}@outlook.com`;
    const testPhone = "+919876500002";
    const otpResult = await createAndSendOtp(testEmail, testPhone);
    assert(otpResult.success === true, "OTP creation and dispatch succeeded");

    const verifyResult = await verifyOtpCode(testEmail, otpResult.devCode!, "Test Resident");
    assert(verifyResult.user.email === testEmail, "Verified user matches email");

    // --- PHASE 3 GEOTAGGING & DEDUPLICATION CHECKS ---
    console.log("\n🔹 [STAGE 3] Geotagging & Deduplication Engine Checks");
    const dist1 = calculateDistanceMeters(12.9784, 77.6408, 12.9784, 77.6410);
    assert(dist1 >= 20 && dist1 <= 25, `Calculated distance between adjacent points: ${dist1}m (~22m)`);

    const citizenUser = await prisma.user.findFirst({ where: { role: "CITIZEN" } });
    assert(citizenUser !== null, "Citizen user exists to author reports");

    const masterIssue = await createCivicIssue({
      title: "Dangerous Pothole near 100ft Road Metro",
      description: "Deep pothole causing bike skids during evening commute",
      categoryCode: "POTHOLE",
      latitude: 12.9784,
      longitude: 77.6408,
      address: "100ft Road, Indiranagar, Bengaluru",
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      reportedById: citizenUser!.id,
    });

    assert(masterIssue.isMaster === true, "First issue created as Master Issue");

    const nearbyLat = 12.9784 + 0.00015;
    const nearbyLng = 77.6408;

    const childIssue = await createCivicIssue({
      title: "Pothole at Indiranagar 100ft road",
      description: "My car tire bumped into this pothole today morning",
      categoryCode: "POTHOLE",
      latitude: nearbyLat,
      longitude: nearbyLng,
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
      reportedById: citizenUser!.id,
      linkedMasterId: masterIssue.id,
    });
    assert(childIssue.isMaster === false, "Child complaint has isMaster = false");

    // --- PHASE 4 COMMUNITY VERIFICATION & DYNAMIC SEVERITY CHECKS ---
    console.log("\n🔹 [STAGE 4] Community Verification & Dynamic Severity Checks");
    const secondCitizen = await prisma.user.create({
      data: {
        email: `citizen.voter.${Date.now()}@gmail.com`,
        phone: "+919876543299",
        name: "Meera Krishnan",
        role: "CITIZEN",
        karma: 15,
      },
    });

    const upvoteResult = await upvoteIssue(masterIssue.id, secondCitizen.id, nearbyLat, nearbyLng);
    assert(upvoteResult.success === true, "2nd citizen upvote succeeded");

    const verifySurveyResult = await submitVerification({
      issueId: masterIssue.id,
      userId: secondCitizen.id,
      isStillPresent: true,
      hazardPerception: "SEVERE",
      comment: "Water is accumulating inside the pothole.",
    });
    assert(verifySurveyResult.success === true, "Submitted community verification survey");

    // --- PHASE 5 WARD OFFICER CONSOLE & WORK ORDERS CHECKS ---
    console.log("\n🔹 [STAGE 5] Ward Officer Work Orders & Geofenced Resolution Checks");
    const workOrder = await createWorkOrder({
      issueId: masterIssue.id,
      assignedOfficerId: officer!.id,
      department: "Roads & Infrastructure",
      priority: "HIGH",
      notes: "Asphalt patch crew dispatched with hot-mix roller.",
    });
    assert(workOrder.workOrderCode.startsWith("WO-"), `Generated Work Order code ${workOrder.workOrderCode}`);

    const onSiteLat = 12.9784 + 0.00008;
    const onSiteLng = 77.6408;

    const resolutionResult = await submitResolutionProof({
      issueId: masterIssue.id,
      officerId: officer!.id,
      afterPhotoUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800",
      resolutionLat: onSiteLat,
      resolutionLng: onSiteLng,
      notes: "Pothole filled with graded asphalt, compacted and leveled.",
      contractorName: "Sri Balaji Roadworks Ltd.",
    });
    assert(resolutionResult.issue.status === "PROVISIONALLY_RESOLVED", "Issue transitioned to PROVISIONALLY_RESOLVED");

    // --- PHASE 6 PUBLIC RESOLUTION TRACKING & CITIZEN DISPUTE CHECKS ---
    console.log("\n🔹 [STAGE 6] Public Resolution Tracking & Anti-Ghost Closure Dispute Checks");
    const disputeResult = await disputeResolution({
      issueId: masterIssue.id,
      userId: secondCitizen.id,
      reason: "Asphalt washed away in rain within 2 hours.",
      evidencePhotoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800",
    });
    assert(disputeResult.issue.status === "REOPENED_DISPUTED", "Issue automatically transitioned to REOPENED_DISPUTED");

    // --- PHASE 7 MUNICIPAL ANALYTICS & CITY OPS CHECKS ---
    console.log("\n🔹 [STAGE 7] Municipal Analytics & Executive Metrics Checks");
    const analytics = await getCityAnalytics();
    assert(analytics.overview.totalComplaintsFiled >= 2, `Total complaints tracked: ${analytics.overview.totalComplaintsFiled}`);
    assert(analytics.overview.masterIncidents >= 1, `Master incidents tracked: ${analytics.overview.masterIncidents}`);
    assert(analytics.overview.duplicatesIntercepted >= 1, `Duplicates intercepted: ${analytics.overview.duplicatesIntercepted}`);
    assert(analytics.overview.deduplicationRatePercent > 0, `Deduplication rate computed: ${analytics.overview.deduplicationRatePercent}%`);
    assert(analytics.wardPerformance.length >= 4, `Ward performance scorecards available: ${analytics.wardPerformance.length} wards`);
    assert(analytics.categoryBreakdown.length >= 6, `Category distribution available: ${analytics.categoryBreakdown.length} categories`);

    console.log(`\n-----------------------------------------`);
    console.log(`Sanity Results: ${passed} passed, ${failed} failed`);
    console.log(`-----------------------------------------\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runSanityCheck();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding CityCivic database...");

  // Seed Wards
  const wards = [
    {
      code: "W01",
      name: "Ward 01 - Central District",
      officerName: "Rajesh Kumar (Executive Engineer)",
      officerContact: "+91 98450 11001",
      centerLat: 12.9716,
      centerLng: 77.5946,
      radiusMeters: 2500,
    },
    {
      code: "W02",
      name: "Ward 02 - Indiranagar",
      officerName: "Priya Sharma (Assistant Executive Engineer)",
      officerContact: "+91 98450 11002",
      centerLat: 12.9784,
      centerLng: 77.6408,
      radiusMeters: 2200,
    },
    {
      code: "W03",
      name: "Ward 03 - Koramangala",
      officerName: "Vikram Reddy (Ward Inspector)",
      officerContact: "+91 98450 11003",
      centerLat: 12.9352,
      centerLng: 77.6245,
      radiusMeters: 2800,
    },
    {
      code: "W04",
      name: "Ward 04 - Malleshwaram",
      officerName: "Deepa Rao (Zonal Supervisor)",
      officerContact: "+91 98450 11004",
      centerLat: 13.0031,
      centerLng: 77.5643,
      radiusMeters: 2400,
    },
  ];

  for (const ward of wards) {
    await prisma.ward.upsert({
      where: { code: ward.code },
      update: ward,
      create: ward,
    });
  }

  // Seed Categories
  const categories = [
    {
      code: "POTHOLE",
      name: "Pothole & Road Damage",
      department: "Roads & Infrastructure",
      baseHazard: 7,
      icon: "alert-triangle",
    },
    {
      code: "MANHOLE",
      name: "Open / Broken Manhole",
      department: "Sanitation & Drainage",
      baseHazard: 9,
      icon: "alert-octagon",
    },
    {
      code: "WATER_LEAK",
      name: "Water Main Burst / Leak",
      department: "Water Supply & Sewerage",
      baseHazard: 6,
      icon: "droplet",
    },
    {
      code: "GARBAGE",
      name: "Illegal Waste / Garbage Dump",
      department: "Solid Waste Management",
      baseHazard: 4,
      icon: "trash-2",
    },
    {
      code: "STREETLIGHT",
      name: "Streetlight Outage / Dark Spot",
      department: "Electrical Works",
      baseHazard: 5,
      icon: "zap-off",
    },
    {
      code: "SEWAGE",
      name: "Sewage Overflow / Contamination",
      department: "Sanitation & Drainage",
      baseHazard: 8,
      icon: "biohazard",
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { code: cat.code },
      update: cat,
      create: cat,
    });
  }

  // Seed Users
  const ward02 = await prisma.ward.findUnique({ where: { code: "W02" } });
  const ward01 = await prisma.ward.findUnique({ where: { code: "W01" } });

  // Ward Officer
  await prisma.user.upsert({
    where: { email: "officer.indiranagar@citycivic.gov" },
    update: {},
    create: {
      email: "officer.indiranagar@citycivic.gov",
      phone: "+919845011002",
      name: "Priya Sharma",
      role: "WARD_OFFICER",
      wardId: ward02?.id,
      karma: 50,
    },
  });

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@citycivic.gov" },
    update: {},
    create: {
      email: "admin@citycivic.gov",
      phone: "+919800000001",
      name: "Civic Commissioner Admin",
      role: "ADMIN",
      wardId: ward01?.id,
      karma: 100,
    },
  });

  // Sample verified citizen
  await prisma.user.upsert({
    where: { email: "citizen.demo@gmail.com" },
    update: {},
    create: {
      email: "citizen.demo@gmail.com",
      phone: "+919876543210",
      name: "Aakash Mehta",
      role: "CITIZEN",
      karma: 25,
    },
  });

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

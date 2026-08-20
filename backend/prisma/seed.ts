import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type OrderType, type RateScope } from "@prisma/client";

const prisma = new PrismaClient();

const RETIRED_ZONE_CODES = ["ZONE_A", "ZONE_B", "ZONE_C", "ZONE_D"];

type AreaSeed = {
  pincode: string;
  areaName: string;
  city: string;
  latitude: number;
  longitude: number;
};

async function upsertZone(data: {
  name: string;
  code: string;
  description: string;
  centroidLat: number;
  centroidLng: number;
  active?: boolean;
  areas: AreaSeed[];
}) {
  const active = data.active ?? true;
  const zone = await prisma.zone.upsert({
    where: { code: data.code },
    update: {
      name: data.name,
      description: data.description,
      centroidLat: data.centroidLat,
      centroidLng: data.centroidLng,
      active,
    },
    create: {
      name: data.name,
      code: data.code,
      description: data.description,
      centroidLat: data.centroidLat,
      centroidLng: data.centroidLng,
      active,
    },
  });

  await prisma.zoneArea.deleteMany({ where: { zoneId: zone.id } });
  await prisma.zoneArea.createMany({
    data: data.areas.map((area) => ({ ...area, zoneId: zone.id })),
  });
  return zone;
}

const HYDERABAD_ZONES: Array<{
  name: string;
  code: string;
  description: string;
  centroidLat: number;
  centroidLng: number;
  areas: AreaSeed[];
}> = [
  {
    name: "Hyderabad West",
    code: "HYD_WEST",
    description: "Gachibowli, Hitech City, Madhapur, and the Financial District",
    centroidLat: 17.44,
    centroidLng: 78.36,
    areas: [
      { pincode: "500084", areaName: "Gachibowli", city: "Hyderabad", latitude: 17.4401, longitude: 78.3489 },
      { pincode: "500084", areaName: "Kondapur", city: "Hyderabad", latitude: 17.4644, longitude: 78.3672 },
      { pincode: "500081", areaName: "Hitech City", city: "Hyderabad", latitude: 17.4483, longitude: 78.3811 },
      { pincode: "500081", areaName: "Madhapur", city: "Hyderabad", latitude: 17.4482, longitude: 78.3915 },
      { pincode: "500032", areaName: "Financial District", city: "Hyderabad", latitude: 17.4197, longitude: 78.3422 },
      { pincode: "500032", areaName: "Nanakramguda", city: "Hyderabad", latitude: 17.4178, longitude: 78.3446 },
      { pincode: "500089", areaName: "Manikonda", city: "Hyderabad", latitude: 17.4036, longitude: 78.3894 },
      { pincode: "500019", areaName: "Lingampally", city: "Hyderabad", latitude: 17.4873, longitude: 78.3172 },
      { pincode: "500033", areaName: "Jubilee Hills", city: "Hyderabad", latitude: 17.4316, longitude: 78.407 },
      { pincode: "500034", areaName: "Banjara Hills", city: "Hyderabad", latitude: 17.4156, longitude: 78.4347 },
    ],
  },
  {
    name: "Hyderabad Central",
    code: "HYD_CENTRAL",
    description: "Abids, Ameerpet, Mehdipatnam, and the inner city",
    centroidLat: 17.385,
    centroidLng: 78.486,
    areas: [
      { pincode: "500001", areaName: "Abids", city: "Hyderabad", latitude: 17.3917, longitude: 78.4736 },
      { pincode: "500001", areaName: "Nampally", city: "Hyderabad", latitude: 17.391, longitude: 78.467 },
      { pincode: "500004", areaName: "Sultan Bazar", city: "Hyderabad", latitude: 17.385, longitude: 78.4863 },
      { pincode: "500016", areaName: "Ameerpet", city: "Hyderabad", latitude: 17.4375, longitude: 78.4483 },
      { pincode: "500016", areaName: "Begumpet", city: "Hyderabad", latitude: 17.4447, longitude: 78.4606 },
      { pincode: "500095", areaName: "Mehdipatnam", city: "Hyderabad", latitude: 17.3943, longitude: 78.4374 },
      { pincode: "500028", areaName: "Humayun Nagar", city: "Hyderabad", latitude: 17.3958, longitude: 78.4572 },
    ],
  },
  {
    name: "Hyderabad East",
    code: "HYD_EAST",
    description: "Dilsukhnagar, Tarnaka, Habsiguda, and LB Nagar",
    centroidLat: 17.37,
    centroidLng: 78.54,
    areas: [
      { pincode: "500036", areaName: "Dilsukhnagar", city: "Hyderabad", latitude: 17.3687, longitude: 78.5247 },
      { pincode: "500035", areaName: "Moosarambagh", city: "Hyderabad", latitude: 17.3752, longitude: 78.5186 },
      { pincode: "500007", areaName: "Habsiguda", city: "Hyderabad", latitude: 17.419, longitude: 78.545 },
      { pincode: "500017", areaName: "Tarnaka", city: "Hyderabad", latitude: 17.4256, longitude: 78.535 },
      { pincode: "500074", areaName: "LB Nagar", city: "Hyderabad", latitude: 17.3496, longitude: 78.5522 },
    ],
  },
  {
    name: "Hyderabad North",
    code: "HYD_NORTH",
    description: "Secunderabad, Bowenpally, and Jeedimetla",
    centroidLat: 17.45,
    centroidLng: 78.5,
    areas: [
      { pincode: "500010", areaName: "Secunderabad", city: "Hyderabad", latitude: 17.4399, longitude: 78.4983 },
      { pincode: "500072", areaName: "Kukatpally", city: "Hyderabad", latitude: 17.4943, longitude: 78.3996 },
      { pincode: "500025", areaName: "West Marredpally", city: "Hyderabad", latitude: 17.4506, longitude: 78.5089 },
      { pincode: "500015", areaName: "Bowenpally", city: "Hyderabad", latitude: 17.4692, longitude: 78.4794 },
      { pincode: "500026", areaName: "Trimulgherry", city: "Hyderabad", latitude: 17.4708, longitude: 78.5067 },
      { pincode: "500055", areaName: "Jeedimetla", city: "Hyderabad", latitude: 17.5136, longitude: 78.4811 },
    ],
  },
  {
    name: "Hyderabad South",
    code: "HYD_SOUTH",
    description: "Santoshnagar, Attapur, and Rajendranagar",
    centroidLat: 17.32,
    centroidLng: 78.45,
    areas: [
      { pincode: "500018", areaName: "Santoshnagar", city: "Hyderabad", latitude: 17.3478, longitude: 78.5086 },
      { pincode: "500053", areaName: "Chandrayangutta", city: "Hyderabad", latitude: 17.3256, longitude: 78.4789 },
      { pincode: "500048", areaName: "Attapur", city: "Hyderabad", latitude: 17.3572, longitude: 78.4294 },
      { pincode: "500030", areaName: "Rajendranagar", city: "Hyderabad", latitude: 17.3194, longitude: 78.4011 },
    ],
  },
];

const RATE_TABLE: Record<
  OrderType,
  Record<RateScope, { baseRate: number; perKgRate: number; codSurcharge: number }>
> = {
  B2C: {
    INTRA_ZONE: { baseRate: 55, perKgRate: 10, codSurcharge: 40 },
    INTER_ZONE: { baseRate: 85, perKgRate: 12, codSurcharge: 50 },
  },
  B2B: {
    INTRA_ZONE: { baseRate: 45, perKgRate: 8, codSurcharge: 25 },
    INTER_ZONE: { baseRate: 70, perKgRate: 10, codSurcharge: 35 },
  },
};

async function seedRateCards(zones: Array<{ id: string; code: string }>) {
  await prisma.rateCard.deleteMany();

  const rows = [];
  for (const orderType of ["B2C", "B2B"] as OrderType[]) {
    for (const source of zones) {
      for (const destination of zones) {
        const rateScope: RateScope = source.id === destination.id ? "INTRA_ZONE" : "INTER_ZONE";
        const rates = RATE_TABLE[orderType][rateScope];
        rows.push({
          name: `${orderType} ${source.code} → ${destination.code}`,
          orderType,
          rateScope,
          sourceZoneId: source.id,
          destinationZoneId: destination.id,
          baseRate: rates.baseRate,
          perKgRate: rates.perKgRate,
          minimumChargeableWeight: 0.5,
          volumetricDivisor: 5000,
          codSurcharge: rates.codSurcharge,
          isFallback: false,
          active: true,
        });
      }
    }
  }

  await prisma.rateCard.createMany({ data: rows });
  return rows.length;
}

async function main() {
  const retiredEmails = ["customer@example.com", "agent1@example.com", "agent2@example.com", "agent3@example.com"];
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    retiredEmails.push("admin@example.com");
  }
  const retired = await prisma.user.findMany({ where: { email: { in: retiredEmails } } });
  if (retired.length > 0) {
    const userIds = retired.map((user) => user.id);
    await prisma.rescheduleRequest.deleteMany({ where: { requestedById: { in: userIds } } });
    await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.order.deleteMany({ where: { customerId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Removed ${retired.length} previous seed login account(s).`);
  }

  await prisma.rateCard.deleteMany();
  await prisma.zoneArea.deleteMany({ where: { zone: { code: { in: RETIRED_ZONE_CODES } } } });
  const retiredZones = await prisma.zone.updateMany({
    where: { code: { in: RETIRED_ZONE_CODES } },
    data: { active: false, description: "Retired demo geography — replaced by Hyderabad zones" },
  });
  if (retiredZones.count > 0) {
    console.log(`Deactivated ${retiredZones.count} previous mixed-city zone(s).`);
  }

  const zones = [];
  for (const zone of HYDERABAD_ZONES) {
    zones.push(await upsertZone(zone));
  }

  const cardCount = await seedRateCards(zones.map((zone) => ({ id: zone.id, code: zone.code })));

  await upsertZone({
    name: "Hyderabad expanding",
    code: "HYD_EXPANDING",
    description: "Coverage planned — not yet open for bookings",
    centroidLat: 17.5,
    centroidLng: 78.39,
    active: false,
    areas: [
      { pincode: "500049", areaName: "Miyapur", city: "Hyderabad", latitude: 17.4969, longitude: 78.3568 },
      { pincode: "500014", areaName: "Kompally", city: "Hyderabad", latitude: 17.5442, longitude: 78.4889 },
      { pincode: "501218", areaName: "Shamshabad", city: "Hyderabad", latitude: 17.2403, longitude: 78.4294 },
    ],
  });

  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME?.trim() || "Platform Admin";

  if (adminEmail && !adminPassword) {
    console.warn("SEED_ADMIN_EMAIL is set but SEED_ADMIN_PASSWORD is missing — skipping admin creation.");
  } else if (adminEmail && adminPassword) {
    if (adminPassword.length < 8) {
      throw new Error("SEED_ADMIN_PASSWORD must be at least 8 characters");
    }
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      console.log(`Admin already exists (${adminEmail}); password was not changed.`);
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.create({
        data: {
          name: adminName,
          email: adminEmail,
          passwordHash,
          role: "ADMIN",
        },
      });
      console.log(`Created admin ${adminEmail} from environment variables.`);
    }
  } else {
    console.log("No SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD — no admin user created.");
  }

  console.log(
    `Seed complete: ${zones.length} Hyderabad zones, ${cardCount} route rate cards. Customers sign up themselves.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

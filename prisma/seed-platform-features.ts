import {
  PrismaClient,
  PlatformFeatureType,
  PlatformPlanInterval,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const catalogName = "Feature Catalog";

const catalogFeatures = [
  { key: "can_use_sms", type: PlatformFeatureType.BOOLEAN, value: "false" },
  { key: "can_use_voice", type: PlatformFeatureType.BOOLEAN, value: "false" },
  { key: "call_recording", type: PlatformFeatureType.BOOLEAN, value: "false" },
  {
    key: "missed_call_text_back",
    type: PlatformFeatureType.BOOLEAN,
    value: "false",
  },
  {
    key: "website_included",
    type: PlatformFeatureType.BOOLEAN,
    value: "false",
  },
  {
    key: "car_wrap_visualizer",
    type: PlatformFeatureType.BOOLEAN,
    value: "false",
  },
  {
    key: "ai_smart_replies",
    type: PlatformFeatureType.BOOLEAN,
    value: "false",
  },
  { key: "awx_sales_agent", type: PlatformFeatureType.BOOLEAN, value: "false" },
  {
    key: "unlimited_automation_rules",
    type: PlatformFeatureType.BOOLEAN,
    value: "false",
  },
  {
    key: "automation_modules",
    type: PlatformFeatureType.TEXT,
    value: "",
  },
  {
    key: "automation_limit_pipeline",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_communication",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_invoice",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_inventory",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_tag",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_service",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_marketing",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
  {
    key: "automation_limit_reporting",
    type: PlatformFeatureType.NUMERIC,
    value: "0",
  },
];

async function main() {
  console.log("🌱 Seeding platform feature catalog...");

  const plan = await prisma.platformPlan.upsert({
    where: { name: catalogName },
    update: {
      description: "Internal feature catalog defaults",
      price: 0,
      interval: PlatformPlanInterval.MONTHLY,
      trialLengthDays: 0,
      displayOrder: 0,
      isActive: false,
    },
    create: {
      name: catalogName,
      description: "Internal feature catalog defaults",
      price: 0,
      interval: PlatformPlanInterval.MONTHLY,
      trialLengthDays: 0,
      displayOrder: 0,
      isActive: false,
    },
  });

  await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
  if (catalogFeatures.length > 0) {
    await prisma.planFeature.createMany({
      data: catalogFeatures.map((feature) => ({
        planId: plan.id,
        featureKey: feature.key,
        value: feature.value,
        type: feature.type,
      })),
    });
  }

  console.log("✅ Platform feature catalog seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient, PlatformFeatureType, PlatformPlanInterval } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Platform Plans...");

  const plans = [
    {
      name: "Starter (Text Only)",
      price: 124,
      setupFee: 100,
      displayOrder: 1,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "false", type: "BOOLEAN" },
        { key: "max_automation_rules", value: "3", type: "NUMERIC" },
        { key: "automation_modules", value: "pipeline,calendar", type: "TEXT" },
        { key: "website_included", value: "false", type: "BOOLEAN" },
      ],
    },
    {
      name: "Starter (Call + Text)",
      price: 149,
      setupFee: 100,
      displayOrder: 2,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "call_recording", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "max_automation_rules", value: "3", type: "NUMERIC" },
        { key: "automation_modules", value: "pipeline,calendar,tag,invoice,inventory", type: "TEXT" },
        { key: "website_included", value: "false", type: "BOOLEAN" },
      ],
    },
    {
      name: "Growth",
      price: 249,
      setupFee: 0,
      displayOrder: 3,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "call_recording", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "website_included", value: "true", type: "BOOLEAN" },
        { key: "car_wrap_visualizer", value: "true", type: "BOOLEAN" },
        { key: "ai_smart_replies", value: "true", type: "BOOLEAN" },
        { key: "max_automation_rules", value: "3", type: "NUMERIC" },
        { key: "automation_modules", value: "pipeline,calendar,communication,invoice,inventory,tag,service", type: "TEXT" },
      ],
    },
    {
      name: "Scale",
      price: 399,
      setupFee: 0,
      displayOrder: 4,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "website_included", value: "true", type: "BOOLEAN" },
        { key: "car_wrap_visualizer", value: "true", type: "BOOLEAN" },
        { key: "awx_sales_agent", value: "true", type: "BOOLEAN" },
        { key: "max_automation_rules", value: "-1", type: "NUMERIC" }, // -1 for unlimited
        { key: "automation_modules", value: "pipeline,marketing,calendar,communication,invoice,inventory,tag", type: "TEXT" },
      ],
    },
  ];

  for (const planData of plans) {
    const { features, setupFee, ...planDetails } = planData;

    const plan = await prisma.platformPlan.upsert({
      where: { name: planDetails.name },
      update: {
        price: planDetails.price,
        displayOrder: planDetails.displayOrder,
      },
      create: {
        ...planDetails,
        interval: "MONTHLY",
      },
    });

    for (const feature of features) {
      await prisma.planFeature.upsert({
        where: {
          planId_featureKey: {
            planId: plan.id,
            featureKey: feature.key,
          },
        },
        update: {
          value: feature.value,
          type: feature.type as any,
        },
        create: {
          planId: plan.id,
          featureKey: feature.key,
          value: feature.value,
          type: feature.type as any,
        },
      });
    }
  }

  console.log("✅ Platform Plans Seeded!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

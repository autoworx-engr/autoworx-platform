import {
  PrismaClient,
  PlatformFeatureType,
  PlatformPlanInterval,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Platform Plans...");

  const plans = [
    {
      name: "Starter (Text Only)",
      price: 124,
      displayOrder: 1,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "false", type: "BOOLEAN" },
        { key: "unlimited_automation_rules", value: "false", type: "BOOLEAN" },
        {
          key: "automation_modules",
          value: "pipeline,calendar,communication,invoice,inventory,tag",
          type: "TEXT",
        },
        { key: "automation_limit_pipeline", value: "3", type: "NUMERIC" },
        { key: "automation_limit_communication", value: "1", type: "NUMERIC" },
        { key: "automation_limit_invoice", value: "1", type: "NUMERIC" },
        { key: "automation_limit_inventory", value: "1", type: "NUMERIC" },
        { key: "automation_limit_tag", value: "1", type: "NUMERIC" },
        { key: "automation_limit_service", value: "0", type: "NUMERIC" },
        { key: "automation_limit_marketing", value: "0", type: "NUMERIC" },
        { key: "automation_limit_reporting", value: "0", type: "NUMERIC" },
        { key: "website_included", value: "false", type: "BOOLEAN" },
      ],
    },
    {
      name: "Starter (Call + Text)",
      price: 149,
      displayOrder: 2,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "call_recording", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "unlimited_automation_rules", value: "false", type: "BOOLEAN" },
        {
          key: "automation_modules",
          value: "pipeline,calendar,communication,invoice,inventory,tag",
          type: "TEXT",
        },
        { key: "automation_limit_pipeline", value: "3", type: "NUMERIC" },
        { key: "automation_limit_communication", value: "1", type: "NUMERIC" },
        { key: "automation_limit_invoice", value: "1", type: "NUMERIC" },
        { key: "automation_limit_inventory", value: "1", type: "NUMERIC" },
        { key: "automation_limit_tag", value: "1", type: "NUMERIC" },
        { key: "automation_limit_service", value: "0", type: "NUMERIC" },
        { key: "automation_limit_marketing", value: "0", type: "NUMERIC" },
        { key: "automation_limit_reporting", value: "0", type: "NUMERIC" },
        { key: "website_included", value: "false", type: "BOOLEAN" },
      ],
    },
    {
      name: "Growth",
      price: 249,
      displayOrder: 3,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "call_recording", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "website_included", value: "true", type: "BOOLEAN" },
        { key: "car_wrap_visualizer", value: "true", type: "BOOLEAN" },
        { key: "ai_smart_replies", value: "true", type: "BOOLEAN" },
        { key: "unlimited_automation_rules", value: "false", type: "BOOLEAN" },
        {
          key: "automation_modules",
          value:
            "pipeline,calendar,communication,invoice,inventory,tag,service",
          type: "TEXT",
        },
        { key: "automation_limit_pipeline", value: "3", type: "NUMERIC" },
        { key: "automation_limit_communication", value: "3", type: "NUMERIC" },
        { key: "automation_limit_invoice", value: "3", type: "NUMERIC" },
        { key: "automation_limit_inventory", value: "3", type: "NUMERIC" },
        { key: "automation_limit_tag", value: "3", type: "NUMERIC" },
        { key: "automation_limit_service", value: "3", type: "NUMERIC" },
        { key: "automation_limit_marketing", value: "0", type: "NUMERIC" },
        { key: "automation_limit_reporting", value: "0", type: "NUMERIC" },
      ],
    },
    {
      name: "Scale",
      price: 399,
      displayOrder: 4,
      features: [
        { key: "can_use_sms", value: "true", type: "BOOLEAN" },
        { key: "can_use_voice", value: "true", type: "BOOLEAN" },
        { key: "missed_call_text_back", value: "true", type: "BOOLEAN" },
        { key: "website_included", value: "true", type: "BOOLEAN" },
        { key: "car_wrap_visualizer", value: "true", type: "BOOLEAN" },
        { key: "awx_sales_agent", value: "true", type: "BOOLEAN" },
        { key: "unlimited_automation_rules", value: "true", type: "BOOLEAN" },
        {
          key: "automation_modules",
          value:
            "pipeline,marketing,calendar,communication,invoice,inventory,tag,service,reporting",
          type: "TEXT",
        },
        { key: "automation_limit_pipeline", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_communication", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_invoice", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_inventory", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_tag", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_service", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_marketing", value: "-1", type: "NUMERIC" },
        { key: "automation_limit_reporting", value: "-1", type: "NUMERIC" },
      ],
    },
  ];

  for (const planData of plans) {
    const { features, ...planDetails } = planData;

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

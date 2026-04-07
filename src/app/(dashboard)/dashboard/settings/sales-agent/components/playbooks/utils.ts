import { ServicePlaybook, ServiceCategory } from "@/types/ai-settings";

export function convertToServicePlaybook(db: any): ServicePlaybook {
  const doSay = Array.isArray(db.doSay)
    ? db.doSay
    : typeof db.doSay === "string"
      ? JSON.parse(db.doSay || "[]")
      : [];
  const dontSay = Array.isArray(db.dontSay)
    ? db.dontSay
    : typeof db.dontSay === "string"
      ? JSON.parse(db.dontSay || "[]")
      : [];

  const pricingRules = (db.pricingRules || []).map((rule: any) => ({
    id: rule.id?.toString() || Date.now().toString(),
    description: rule.description || "",
    price_range: {
      min: rule.minPrice || 0,
      max: rule.maxPrice || 0,
    },
    factors: [],
  }));

  const faqs = (db.faqs || []).map((faq: any) => ({
    id: faq.id?.toString() || Date.now().toString(),
    question: faq.question || "",
    answer: faq.answer || "",
  }));

  const categoryName =
    db.category?.name?.toLowerCase().replace(/\s+/g, "_") || "other";

  return {
    id: db.id?.toString() || "",
    shop_id: "default",
    service_name: db.serviceName || "",
    category: (categoryName as ServiceCategory) || "other",
    categoryId: db.categoryId,
    categoryData: db.category,
    overview: db.overview || "",
    pricing_rules: pricingRules,
    intake_questions: [],
    faqs: faqs,
    upsells: [],
    do_say: doSay,
    dont_say: dontSay,
    warranty_policy: db.warrantyPolicy || "",
    time_estimate: db.timeEstimate || "",
    scheduling_notes: db.schedulingNotes || "",
    is_active: db.isActive ?? true,
    created_at: db?.createdAt || new Date(),
    updated_at: db?.updatedAt || new Date(),
  };
}

import { z } from "zod";

export const pricingRuleSchema = z.object({
  description: z.string().min(1),
  minPrice: z.number().nonnegative(),
  maxPrice: z.number().nonnegative(),
  factors: z.any(),
});

export const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const createServicePlaybookSchema = z.object({
  companyId: z.string().uuid(),
  serviceName: z.string().min(1, "Service name is required"),
  categoryId: z.number().int().nullable().optional(),
  overview: z.string().nullable().optional(),
  timeEstimate: z.string().nullable().optional(),
  schedulingNotes: z.string().nullable().optional(),
  warrantyPolicy: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  doSay: z.any().optional(),
  dontSay: z.any().optional(),
  pricingRules: z.array(pricingRuleSchema).optional(),
  faqs: z.array(faqSchema).optional(),
});

export const updateServicePlaybookSchema = z.object({
  serviceName: z.string().min(1),
  categoryId: z.number().int().nullable().optional(),
  overview: z.string().nullable().optional(),
  timeEstimate: z.string().nullable().optional(),
  schedulingNotes: z.string().nullable().optional(),
  warrantyPolicy: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  doSay: z.any().optional(),
  dontSay: z.any().optional(),
  pricingRules: z.array(pricingRuleSchema).optional(),
  faqs: z.array(faqSchema).optional(),
});

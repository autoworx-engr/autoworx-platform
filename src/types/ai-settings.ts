// Core Types for AWX AI SMS Sales Agent

export interface Shop {
  id: string;
  name: string;
  phone: string;
  address: string;
  hours: BusinessHours;
  timezone: string;
  logo_url?: string;
  created_at: string;
}

export interface BusinessHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface ServicePlaybook {
  id: string;
  shop_id: string;
  service_name: string;
  category: ServiceCategory;
  categoryId?: string | number;
  categoryData?: any;
  overview: string;
  pricing_rules: PricingRule[];
  intake_questions: IntakeQuestion[];
  faqs: FAQ[];
  upsells: Upsell[];
  do_say: string[];
  dont_say: string[];
  warranty_policy: string;
  time_estimate: string;
  scheduling_notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceCategory =
  | "vinyl_wrap"
  | "ppf"
  | "tint"
  | "ceramic_coating"
  | "detailing"
  | "audio"
  | "lighting"
  | "paint"
  | "powder_coat"
  | "auto_body"
  | "other";

export interface PricingRule {
  id: string;
  description: string;
  base_price?: number;
  price_range?: { min: number; max: number };
  factors: string[];
}

export interface IntakeQuestion {
  id: string;
  question: string;
  type: "text" | "select" | "multi_select" | "number";
  options?: string[];
  required: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export interface Upsell {
  id: string;
  service: string;
  description: string;
  trigger_conditions: string[];
}

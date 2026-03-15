export interface CustomEventProps {
  serviceType: "Tint" | "Detailing" | "PPF" | "Wrap" | "Custom Work";
  carModel?: string;
  price?: string;
  description?: string;
  technicians?: string[];
  phone?: string;
}

export type ServiceType = CustomEventProps["serviceType"];

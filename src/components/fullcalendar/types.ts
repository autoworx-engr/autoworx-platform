export interface CustomEventProps {
  serviceType: "Low" | "Medium" | "High" | "Appointment" | string;
  carModel?: string;
  price?: string;
  description?: string;
  technicians?: string[];
  phone?: string;
}

export type ServiceType = CustomEventProps["serviceType"];

import type {
  VirtualShopBookingCalendarItem,
  VirtualShopServiceBookingListResponse,
} from "@/service/virtual-shop/api";

export type AppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed";

export type AppointmentService = {
  name: string;
  vehicleType: string;
  price: number;
  extraFee: number;
};

export type Appointment = {
  id: number;
  clientName: string;
  status: AppointmentStatus;
  date: string;
  startTime: string;
  endTime: string;
  vehicle: string;
  services: AppointmentService[];
};

export type CalendarTabProps = {
  viewMode: "grid" | "list";
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
  selectedDatePage: number;
  listPage: number;
  monthCalendarResponse: {
    success: boolean;
    data: VirtualShopBookingCalendarItem[];
  };
  selectedDateResponse: VirtualShopServiceBookingListResponse;
  monthListResponse: VirtualShopServiceBookingListResponse;
};

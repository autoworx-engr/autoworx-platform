import { ComponentType } from "react";
import {
  Calendar,
  ChartPie,
  CreditCard,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  SquareActivity,
  Users,
} from "lucide-react";

// Shared icon map for nav items so mobile and desktop stay consistent.
export const navIconMap: Record<string, ComponentType<any> | string> = {
  Dashboard: LayoutDashboard,
  "Communication Hub": "/icons/navbar/message.svg",
  Pipelines: SquareActivity,
  "Task and Activity Management": Calendar,
  "Analytics and Reporting": ChartPie,
  Invoices: FileText,
  Payments: "/icons/navbar/coin.svg",
  Inventory: Package,
  Directory: Users,
  Visualization: "/icons/navbar/visualization.png",
  Settings: Settings,
};

import getUser from "@/lib/getUser";
import DashboardAdmin from "./DashboardAdmin";
import DashboardManager from "./DashboardManager";
import { notFound } from "next/navigation";
import DashboardSales from "./DashboardSales";
import DashboardTechnician from "./DashboardTechnician";
import DashboardOther from "./DashboardOther";

export default async function Dashboard() {
  const user = await getUser();

  switch (user?.employeeType) {
    case "Admin": {
      return <DashboardAdmin />;
    }
    case "Manager": {
      return <DashboardManager />;
    }
    case "Sales": {
      return <DashboardSales />;
    }
    case "Technician": {
      return <DashboardTechnician />;
    }
    case "Other": {
      return <DashboardOther />;
    }
    default:
      return notFound(); // Invalid employee type, return 404
  }
}

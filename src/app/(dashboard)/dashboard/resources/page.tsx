// app/payments/page.tsx
import { Metadata } from "next";
import DashboardResourcePage from "./DashboardResourcePage";

export const metadata: Metadata = {
  title: "Resource",
  description: "View and manage your resources.",
};

export default function Page() {
  return <DashboardResourcePage />;
}

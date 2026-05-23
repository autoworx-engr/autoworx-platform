// app/payments/page.tsx
import { Metadata } from "next";
import DashboardResourcePage from "./DashboardResourcePage";

export const metadata: Metadata = {
  title: "Resource",
};

export default function Page() {
  return <DashboardResourcePage />;
}

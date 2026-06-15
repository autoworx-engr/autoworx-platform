import BillingPage from "./BillingPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Billing",
  description: "Manage your billing settings",
};

export default function Page() {
  return <BillingPage />;
}

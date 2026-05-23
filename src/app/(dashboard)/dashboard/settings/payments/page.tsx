import PaymentsPage from "./PaymentsPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Payments",
  description: "Configure payment gateways and integrations",
};

export default function Page() {
  return <PaymentsPage />;
}

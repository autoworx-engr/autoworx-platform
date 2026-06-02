import EstimateAndInvoicePage from "./EstimateAndInvoicePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings - Estimates",
  description: "Configure estimates and invoices",
};

export default function Page() {
  return <EstimateAndInvoicePage />;
}

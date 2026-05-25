import { Metadata } from "next";
import PaymentPage from "./PaymentPage";

export const metadata: Metadata = {
  title: "Payments",
  description: "View and manage all your payments.",
};

export default function Page() {
  return <PaymentPage />;
}

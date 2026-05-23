import { Metadata } from "next";
import PaymentPage from "./PaymentPage";

export const metadata: Metadata = {
  title: "Payments",
};

export default function Page() {
  return <PaymentPage />;
}

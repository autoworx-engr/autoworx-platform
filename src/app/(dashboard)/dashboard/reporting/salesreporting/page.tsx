import { Metadata } from "next";
import SalesReportPage from "./SalesReportPage";

export const metadata: Metadata = {
  title: "Sales Reporting",
  description: "View and analyze your sales reports and performance.",
};

export default function Page(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  return <SalesReportPage {...props} />;
}

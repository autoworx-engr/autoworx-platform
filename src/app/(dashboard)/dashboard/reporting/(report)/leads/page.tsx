import { Metadata } from "next";
import PipelinePage from "./PipelinePage";

export const metadata: Metadata = {
  title: "Analytics & Reporting - Leads",
  description: "Analytics & Reporting - Leads",
};

export default function Page(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  return <PipelinePage {...props} />;
}

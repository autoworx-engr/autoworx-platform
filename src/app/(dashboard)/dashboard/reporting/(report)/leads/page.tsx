import { Metadata } from "next";
import PipelinePage from "./PipelinePage";

export const metadata: Metadata = {
  title: "Analytics - Leads",
  description: "Analyze lead generation and conversion performance",
};

export default function Page(props: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  return <PipelinePage {...props} />;
}

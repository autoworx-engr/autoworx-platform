import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import Leads from "../../components/Leads";
import { Suspense } from "react";
import { Spin } from "antd";

// Loading component for better UX
function LoadingLeads() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

export default async function Page() {
  try {
    const columns = await getColumnsByType("sales");
    return (
      <Suspense fallback={<LoadingLeads />}>
        <Leads salesColumn={columns} />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading leads page:", error);
    return (
      <div
        className="flex w-full items-center justify-center"
        style={{ height: "calc(100vh - 150px)" }}
      >
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-600">
            Error Loading Leads
          </h2>
          <p className="text-sm text-gray-500">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }
}

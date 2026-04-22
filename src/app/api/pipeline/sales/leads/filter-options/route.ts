import { getLeadFilterOptions } from "@/actions/pipelines/getLeads";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const filterOptions = await getLeadFilterOptions();
    return NextResponse.json({ success: true, data: filterOptions });
  } catch (error: any) {
    console.error(
      "Error in GET /api/pipeline/sales/leads/filter-options:",
      error,
    );
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch filter options",
      },
      { status: 500 },
    );
  }
}

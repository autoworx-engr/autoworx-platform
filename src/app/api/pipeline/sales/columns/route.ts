import {
  getColumnsByType,
  createColumn,
} from "@/actions/pipelines/pipelinesColumn";
import { getCompanyIdFromBearer } from "@/lib/mobileAuth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") ?? "sales";

    const bearerCompanyId = await getCompanyIdFromBearer(request);
    const queryCompanyId = searchParams.get("companyId");
    const companyId =
      bearerCompanyId ??
      (queryCompanyId ? parseInt(queryCompanyId, 10) : undefined);

    const rawColumns = await getColumnsByType(type, companyId);

    // Strip nested lead data — mobile only needs column metadata.
    const columns = rawColumns.map(({ lead: _lead, ...col }) => col);

    return NextResponse.json({ success: true, data: columns });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to fetch columns",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, type, textColor, bgColor } = body;

    if (!title || !type) {
      return NextResponse.json(
        { success: false, error: "Title and type are required" },
        { status: 400 },
      );
    }

    const newColumn = await createColumn(title, type, textColor, bgColor);

    return NextResponse.json({ success: true, data: newColumn });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message || "Failed to create column",
      },
      { status: 500 },
    );
  }
}

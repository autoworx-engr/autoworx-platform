import { NextResponse } from "next/server";

/**
 * Extract and validate companyId from query parameters
 * @param req - Request object
 * @returns { companyId: number } or NextResponse error
 */
export function validateCompanyId(
  req: Request,
): { companyId: number } | NextResponse {
  try {
    const { searchParams } = new URL(req.url);
    const companyIdParam = searchParams.get("companyId");
    const companyId = Number(companyIdParam);

    if (!companyIdParam || !Number.isFinite(companyId)) {
      return NextResponse.json(
        { success: false, message: "Company ID is required" },
        { status: 400 },
      );
    }

    return { companyId };
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}

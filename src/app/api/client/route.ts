import { addCustomer } from "@/actions/client/add";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      firstName,
      lastName,
      mobile,
      countryCode,
      email,
      address,
      companyId,
    } = body;

    if (!firstName?.trim()) {
      return NextResponse.json(
        { success: false, message: "firstName is required" },
        { status: 400 },
      );
    }
    if (!companyId) {
      return NextResponse.json(
        { success: false, message: "companyId is required" },
        { status: 400 },
      );
    }

    const result = await addCustomer({
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      mobile,
      countryCode,
      email: email?.trim() || undefined,
      address: address?.trim() || undefined,
      forceCompanyId: companyId,
    });

    if (result?.type === "globalError" || result?.type === "error") {
      return NextResponse.json(
        { success: false, message: (result as { message: string }).message },
        { status: 409 },
      );
    }

    const created = (result as { type: "success"; data: unknown }).data;
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create client" },
      { status: 500 },
    );
  }
}

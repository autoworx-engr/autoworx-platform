// TODO: Rate limiting — called on mobile pipeline screen mount.

import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { extractCompanyId, pipelineError } from "../_shared";

const TAG_SELECT = {
  id: true,
  name: true,
  bgColor: true,
  textColor: true,
  type: true,
  companyId: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);

    const tags = await db.tag.findMany({
      where: { companyId, type: "SALES" },
      orderBy: { id: "asc" },
      select: TAG_SELECT,
    });

    return NextResponse.json({ success: true, data: tags });
  } catch (error) {
    return pipelineError(error, "Failed to fetch tags");
  }
}

export async function POST(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);

    const body = await request.json();
    const name: string = typeof body.name === "string" ? body.name.trim() : "";
    const bgColor: string =
      typeof body.bgColor === "string" ? body.bgColor.trim() : "";
    const textColor: string =
      typeof body.textColor === "string" ? body.textColor.trim() : "";

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Tag name is required" },
        { status: 400 },
      );
    }
    if (!bgColor || !textColor) {
      return NextResponse.json(
        { success: false, error: "Tag color is required" },
        { status: 400 },
      );
    }

    // Duplicate check — case-insensitive within same company + type
    const existing = await db.tag.findFirst({
      where: {
        companyId,
        type: "SALES",
        name: { equals: name, mode: "insensitive" },
      },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A tag with this name already exists" },
        { status: 409 },
      );
    }

    const tag = await db.tag.create({
      data: { name, bgColor, textColor, type: "SALES", companyId },
      select: TAG_SELECT,
    });

    return NextResponse.json(
      { success: true, message: "Tag created successfully", data: tag },
      { status: 201 },
    );
  } catch (error) {
    return pipelineError(error, "Failed to create tag");
  }
}

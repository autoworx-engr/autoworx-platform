// TODO: Rate limiting — GET is called on every mobile screen mount.

import { createColumn } from "@/actions/pipelines/pipelinesColumn";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { extractCompanyId, pipelineError } from "../_shared";

const VALID_TYPES = ["sales", "shop"] as const;
type ColumnType = (typeof VALID_TYPES)[number];

const columnSelect = {
  id: true,
  title: true,
  type: true,
  order: true,
  bgColor: true,
  textColor: true,
  companyId: true,
} as const;

export async function GET(request: NextRequest) {
  try {
    const companyId = await extractCompanyId(request);
    const rawType = request.nextUrl.searchParams.get("type") ?? "sales";
    const type: ColumnType = (VALID_TYPES as readonly string[]).includes(
      rawType,
    )
      ? (rawType as ColumnType)
      : "sales";

    const columns = await db.column.findMany({
      where: { type, companyId },
      orderBy: { order: "asc" },
      select: columnSelect,
    });

    return NextResponse.json({ success: true, data: columns });
  } catch (error) {
    return pipelineError(error, "Failed to fetch columns");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { title, type, textColor, bgColor } = body as Record<string, unknown>;

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "title is required and must be a non-empty string",
        },
        { status: 400 },
      );
    }
    if (
      typeof type !== "string" ||
      !(VALID_TYPES as readonly string[]).includes(type)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `type must be one of: ${VALID_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const sanitizedTitle = title.trim().slice(0, 100);
    const sanitizedTextColor =
      typeof textColor === "string" ? textColor.trim().slice(0, 20) : undefined;
    const sanitizedBgColor =
      typeof bgColor === "string" ? bgColor.trim().slice(0, 20) : undefined;

    const newColumn = await createColumn(
      sanitizedTitle,
      type,
      sanitizedTextColor,
      sanitizedBgColor,
    );

    return NextResponse.json({ success: true, data: newColumn });
  } catch (error) {
    return pipelineError(error, "Failed to create column");
  }
}

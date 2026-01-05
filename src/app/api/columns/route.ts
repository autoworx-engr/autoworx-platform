import { getColumnsByType } from "@/actions/pipelines/pipelinesColumn";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { type } = await req.json();
  const columns = await getColumnsByType(type);
  return NextResponse.json(columns);
}

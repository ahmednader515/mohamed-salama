import { NextResponse } from "next/server";
import { getTeachersFeatureEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const teachersEnabled = await getTeachersFeatureEnabled();
  return NextResponse.json({ teachersEnabled });
}

import { NextResponse } from "next/server";
import { getTeachersFeatureEnabled, listTeachersForHomepage } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "الميزة غير مفعّلة" }, { status: 404 });
  }
  const teachers = await listTeachersForHomepage();
  return NextResponse.json({ teachers });
}

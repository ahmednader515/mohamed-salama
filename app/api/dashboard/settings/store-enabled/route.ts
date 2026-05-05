import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { setStoreFeatureEnabled } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: { enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled مطلوب (true/false)" }, { status: 400 });
  }
  try {
    await setStoreFeatureEnabled(body.enabled);
  } catch (e) {
    console.error("store-enabled PATCH", e);
    return NextResponse.json(
      { error: "تعذر حفظ الإعداد. نفّذ scripts/add-store-feature.sql إن لزم." },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true, storeEnabled: body.enabled });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTeachersFeatureEnabled, HOME_TEACHER_PREVIEW_MAX, setTeacherHomepageFeaturedSlots } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "فعّل ميزة المدرسين أولاً" }, { status: 400 });
  }
  let body: { orderedTeacherIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const raw = body.orderedTeacherIds;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "orderedTeacherIds يجب أن يكون مصفوفة معرفات" }, { status: 400 });
  }
  const orderedTeacherIds = raw.map((x) => String(x ?? "").trim()).filter((id) => id.length > 0);
  if (orderedTeacherIds.length > HOME_TEACHER_PREVIEW_MAX) {
    return NextResponse.json(
      { error: `لا يزيد عن ${HOME_TEACHER_PREVIEW_MAX} مدرسين في الرئيسية` },
      { status: 400 },
    );
  }
  try {
    await setTeacherHomepageFeaturedSlots(orderedTeacherIds);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg || "فشل الحفظ" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

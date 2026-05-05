import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateHomepageSettings } from "@/lib/db";

const TITLE_MAX = 200;
const DESC_MAX = 2000;

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: { title?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const titleRaw = typeof body.title === "string" ? body.title.trim() : "";
  const descRaw = typeof body.description === "string" ? body.description.trim() : "";
  if (!titleRaw) {
    return NextResponse.json({ error: "عنوان قسم المتجر في الرئيسية مطلوب" }, { status: 400 });
  }
  try {
    await updateHomepageSettings({
      store_section_title: titleRaw.slice(0, TITLE_MAX),
      store_section_description: descRaw.length > 0 ? descRaw.slice(0, DESC_MAX) : null,
    });
  } catch (e) {
    console.error("store-home-section PATCH", e);
    return NextResponse.json(
      { error: "تعذر الحفظ. نفّذ سكربت SQL لإضافة الأعمدة إن لزم." },
      { status: 500 },
    );
  }
  return NextResponse.json({ success: true });
}

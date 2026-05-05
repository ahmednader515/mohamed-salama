import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completePasswordChangeRequest } from "@/lib/db";

/** تنفيذ طلب تغيير كلمة المرور (تطبيق كلمة المرور الجديدة على الحساب) — للأدمن فقط */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "تنفيذ الطلب للأدمن فقط" }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
  }

  try {
    const done = await completePasswordChangeRequest(id, session.user.id);
    if (!done) {
      return NextResponse.json({ error: "الطلب غير موجود أو تم تنفيذه مسبقاً" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("password-change-requests complete:", e);
    return NextResponse.json({ error: "فشل تنفيذ الطلب" }, { status: 500 });
  }
}

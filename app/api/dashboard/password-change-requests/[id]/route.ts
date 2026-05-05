import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deletePasswordChangeRequest } from "@/lib/db";

/** حذف طلب تغيير كلمة المرور — للأدمن ومساعد الأدمن */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "معرّف الطلب مطلوب" }, { status: 400 });
  }

  try {
    await deletePasswordChangeRequest(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("password-change-requests [id] DELETE:", e);
    return NextResponse.json({ error: "فشل حذف الطلب" }, { status: 500 });
  }
}

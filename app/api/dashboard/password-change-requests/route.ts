import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPasswordChangeRequests } from "@/lib/db";

/** قائمة طلبات تغيير كلمة المرور — للأدمن ومساعد الأدمن */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const list = await getPasswordChangeRequests();
    return NextResponse.json(list);
  } catch (e) {
    console.error("password-change-requests GET:", e);
    return NextResponse.json({ error: "فشل جلب الطلبات" }, { status: 500 });
  }
}

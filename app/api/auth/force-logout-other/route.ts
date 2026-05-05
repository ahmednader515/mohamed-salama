import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getUserByEmailOrPhone, clearCurrentSessionId } from "@/lib/db";

/** تسجيل الخروج من الجهاز الآخر — يتحقق من البريد/كلمة المرور ثم يمسح الجلسة النشطة ليتسنى تسجيل الدخول من هذا الجهاز */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json({ error: "البريد وكلمة المرور مطلوبان" }, { status: 400 });
    }
    const user = await getUserByEmailOrPhone(email);
    if (!user) {
      return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }
    const ok = await compare(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "البريد أو كلمة المرور غير صحيحة" }, { status: 401 });
    }
    await clearCurrentSessionId(user.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("force-logout-other:", e);
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}

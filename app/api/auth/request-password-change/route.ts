import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getUserByEmailOrPhone, createPasswordChangeRequest } from "@/lib/db";

/**
 * طلب تغيير كلمة المرور (نسيان كلمة المرور).
 * لا نتحقق من كلمة المرور الحالية — المستخدم ناسيها. نكتفي بالبريد/الرقم وكلمة المرور الجديدة.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailOrPhone = typeof body.emailOrPhone === "string" ? body.emailOrPhone.trim() : "";
    const oldPassword = typeof body.oldPassword === "string" ? body.oldPassword.trim() : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!emailOrPhone || !newPassword) {
      return NextResponse.json(
        { error: "البريد/رقم الهاتف وكلمة المرور الجديدة مطلوبة" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" },
        { status: 400 }
      );
    }

    const user = await getUserByEmailOrPhone(emailOrPhone);
    if (!user) {
      return NextResponse.json(
        { error: "البريد الإلكتروني أو رقم الهاتف غير مسجّل" },
        { status: 400 }
      );
    }

    const newPasswordHash = await hash(newPassword, 12);
    await createPasswordChangeRequest(
      user.id,
      newPasswordHash,
      emailOrPhone,
      oldPassword || null,
      newPassword
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("request-password-change:", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("PasswordChangeRequest") || msg.includes("does not exist") || msg.includes("relation")) {
      return NextResponse.json(
        { error: "جدول طلبات تغيير كلمة المرور غير موجود. شغّل سكربت scripts/add-password-change-requests.sql على Neon." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الطلب" }, { status: 500 });
  }
}

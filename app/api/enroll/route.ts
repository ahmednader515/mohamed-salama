import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseById, getEnrollment, getUserById, createEnrollment, updateUser, createPayment } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  if (!courseId) {
    return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  }

  const course = await getCourseById(courseId);
  if (!course || !(course as { isPublished?: boolean }).isPublished) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const existing = await getEnrollment(session.user.id, courseId);
  if (existing) {
    return NextResponse.json({ error: "مسجّل في هذه الدورة مسبقاً" }, { status: 400 });
  }

  const user = await getUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  }

  const coursePrice = Number((course as { price?: string }).price) || 0;
  const userBalance = Number(user.balance) || 0;

  if (coursePrice > 0 && userBalance < coursePrice) {
    const needed = coursePrice - userBalance;
    return NextResponse.json(
      {
        error: `رصيدك غير كافٍ. سعر الدورة: ${coursePrice.toFixed(2)} ج.م، رصيدك: ${userBalance.toFixed(2)} ج.م. تحتاج: ${needed.toFixed(2)} ج.م`,
        insufficientBalance: true,
        coursePrice,
        userBalance,
      },
      { status: 400 }
    );
  }

  if (coursePrice > 0) {
    const newBalance = String(Math.max(0, userBalance - coursePrice));
    await updateUser(session.user.id, { balance: newBalance });
    await createPayment(session.user.id, courseId, coursePrice);
  }
  await createEnrollment(session.user.id, courseId);

  return NextResponse.json({
    success: true,
    message: coursePrice > 0 ? `تم التسجيل وخصم ${coursePrice.toFixed(2)} ج.م من رصيدك` : "تم التسجيل بنجاح",
  });
}

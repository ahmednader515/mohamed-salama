import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getActivationCodeByCode, useActivationCode, getEnrollment } from "@/lib/db";

/** تفعيل كود مجاني لدورة — للطالب فقط */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "كود التفعيل مطلوب" }, { status: 400 });
  }

  const row = await getActivationCodeByCode(code);
  if (!row) {
    return NextResponse.json({ error: "كود غير صالح أو مستخدم مسبقاً" }, { status: 404 });
  }
  const courseId = row.courseId;

  const alreadyEnrolled = await getEnrollment(session.user.id, courseId);
  if (alreadyEnrolled) {
    return NextResponse.json({ error: "أنت مسجّل أصلاً في هذه الدورة" }, { status: 400 });
  }

  const result = await useActivationCode(row.id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "كود غير صالح أو مستخدم مسبقاً" }, { status: 404 });
  }

  const isPartial = (result.lessonIds?.length ?? 0) > 0 || (result.quizIds?.length ?? 0) > 0;
  return NextResponse.json({
    success: true,
    message: isPartial
      ? "تم تفعيل الكود وإتاحة حصص محددة داخل الدورة بنجاح"
      : "تم تفعيل الكود والتسجيل في الدورة بنجاح",
    courseId: result.courseId,
    scope: isPartial ? "partial" : "full",
  });
}

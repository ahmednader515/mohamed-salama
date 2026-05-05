import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, getCourseById, getEnrollment, createEnrollment } from "@/lib/db";

/** إضافة طالب إلى دورة (بدون خصم رصيد) - للأدمن فقط */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: userId } = await params;
  let body: { courseId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const courseId = body.courseId?.trim();
  if (!courseId) {
    return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  }

  const user = await getUserById(userId);
  if (!user) {
    return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
  }

  const course = await getCourseById(courseId);
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }

  const existing = await getEnrollment(userId, courseId);
  if (existing) {
    return NextResponse.json({ error: "الطالب مسجّل في هذه الدورة مسبقاً" }, { status: 400 });
  }

  await createEnrollment(userId, courseId);

  return NextResponse.json({ success: true });
}

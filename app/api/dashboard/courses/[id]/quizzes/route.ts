import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseForEdit } from "@/lib/db";

/** جلب اختبارات دورة — للأدمن/مساعد الأدمن (عناوين فقط للاختيار في نطاق الكود) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  }
  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "معرّف الدورة مطلوب" }, { status: 400 });
  }

  try {
    const data = await getCourseForEdit(id.trim());
    if (!data?.course) {
      return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
    }
    const c0 = data.course as { createdById?: string | null; created_by_id?: string | null };
    const createdBy = c0.createdById ?? c0.created_by_id ?? null;
    if (!canManageCourse(session.user.role, session.user.id, createdBy)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const quizzes = (data.quizzes ?? []).map((q) => ({
      id: String(q.id ?? ""),
      title: String(q.title ?? ""),
    }));
    return NextResponse.json(quizzes);
  } catch (e) {
    console.error("dashboard course quizzes:", e);
    return NextResponse.json({ error: "فشل جلب الاختبارات" }, { status: 500 });
  }
}


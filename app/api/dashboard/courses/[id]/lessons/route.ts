import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseById, getLessonsByCourseId } from "@/lib/db";

/** جلب حصص دورة — للأدمن/مساعد الأدمن */
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

  const course = await getCourseById(id.trim());
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const createdBy = (course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null;
  if (!canManageCourse(session.user.role, session.user.id, createdBy)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  try {
    const lessons = await getLessonsByCourseId(id.trim());
    const payload = lessons.map((l) => {
      const r = l as unknown as Record<string, unknown>;
      return {
        id: String(r.id ?? ""),
        title: String(r.title ?? ""),
        titleAr: (r.titleAr ?? r.title_ar ?? null) as string | null,
        order: Number(r.order ?? 0),
      };
    });
    return NextResponse.json(payload);
  } catch (e) {
    console.error("dashboard course lessons:", e);
    return NextResponse.json({ error: "فشل جلب الحصص" }, { status: 500 });
  }
}


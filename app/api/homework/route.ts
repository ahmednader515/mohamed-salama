import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listHomeworkSubmissionsForAdmin,
  listHomeworkSubmissionsForTeacher,
  getHomeworkSubmissionsByCourseAndUser,
  getHomeworkSubmissionsByLessonAndUser,
  deleteHomeworkSubmissionsByIds,
  deleteHomeworkSubmissionsByIdsForTeacher,
  deleteAllHomeworkSubmissions,
} from "@/lib/db";

/** قائمة تسليمات الواجبات — أدمن: الكل مع بحث باسم الطالب؛ طالب: تسليماته لدورة معيّنة */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId") || undefined;
  const lessonId = searchParams.get("lessonId") || undefined;
  const studentSearch = searchParams.get("studentName") || undefined;

  try {
    if (session.user.role === "ADMIN" || session.user.role === "ASSISTANT_ADMIN") {
      const list = await listHomeworkSubmissionsForAdmin(studentSearch || null);
      return NextResponse.json(list);
    }

    if (session.user.role === "TEACHER") {
      const list = await listHomeworkSubmissionsForTeacher(session.user.id, studentSearch || null);
      return NextResponse.json(list);
    }

    if (session.user.role === "STUDENT") {
      if (lessonId) {
        const list = await getHomeworkSubmissionsByLessonAndUser(lessonId, session.user.id);
        return NextResponse.json(list);
      }
      if (courseId) {
        const list = await getHomeworkSubmissionsByCourseAndUser(courseId, session.user.id);
        return NextResponse.json(list);
      }
      return NextResponse.json({ error: "معرف الحصة أو الدورة مطلوب" }, { status: 400 });
    }

    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  } catch (err) {
    console.error("[GET /api/homework]", err);
    const message =
      err instanceof Error && err.message.trim() !== "" ? err.message : "فشل تحميل قائمة الواجبات";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** حذف تسليمات واجبات — أدمن/مساعد: حذف المحدد (ids) أو حذف الكل (deleteAll) */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: { ids?: string[]; deleteAll?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (body.deleteAll === true) {
    if (session.user.role === "TEACHER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    await deleteAllHomeworkSubmissions();
    return NextResponse.json({ success: true, deleted: "all" });
  }
  let ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string" && id.trim()) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "حدّد تسليمات للحذف أو استخدم حذف الكل" }, { status: 400 });
  }
  const count =
    session.user.role === "TEACHER"
      ? await deleteHomeworkSubmissionsByIdsForTeacher(session.user.id, ids)
      : await deleteHomeworkSubmissionsByIds(ids);
  return NextResponse.json({ success: true, deleted: count });
}

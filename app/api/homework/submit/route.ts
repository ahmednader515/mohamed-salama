import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCourseById, getLessonById, getEnrollment, createHomeworkSubmission, hasFullCourseAccessAsStudent } from "@/lib/db";

/** تسليم واجب — للطالب المسجّل: إما مرتبط بحصة (lessonId) أو بالكورس (courseId) قديماً */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: { courseId?: string; lessonId?: string; type?: string; linkUrl?: string; fileUrl?: string; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const lessonId = body.lessonId?.trim();
  const courseId = body.courseId?.trim();
  const type = body.type === "link" || body.type === "pdf" || body.type === "image" ? body.type : null;
  if (!type) {
    return NextResponse.json({ error: "نوع التسليم مطلوب" }, { status: 400 });
  }

  let finalCourseId: string;

  if (lessonId) {
    const lesson = await getLessonById(lessonId);
    if (!lesson || !(lesson as { accepts_homework?: boolean }).accepts_homework) {
      return NextResponse.json({ error: "الحصة غير موجودة أو لا تقبل تسليم واجبات" }, { status: 404 });
    }
    finalCourseId = lesson.course_id;
    const canSubmit =
      (await getEnrollment(session.user.id, finalCourseId)) ||
      (await hasFullCourseAccessAsStudent(session.user.id, finalCourseId));
    if (!canSubmit) {
      return NextResponse.json({ error: "يجب التسجيل في الدورة أولاً" }, { status: 403 });
    }
    if (type === "link") {
      const linkUrl = body.linkUrl?.trim();
      if (!linkUrl || !linkUrl.startsWith("http")) {
        return NextResponse.json({ error: "رابط صالح مطلوب" }, { status: 400 });
      }
      await createHomeworkSubmission({
        course_id: finalCourseId,
        user_id: session.user.id,
        lesson_id: lessonId,
        submission_type: "link",
        link_url: linkUrl,
      });
      return NextResponse.json({ success: true, message: "تم تسليم الرابط بنجاح" });
    }
    if (type === "pdf" || type === "image") {
      const fileUrl = body.fileUrl?.trim();
      if (!fileUrl) return NextResponse.json({ error: "رابط الملف مطلوب بعد الرفع" }, { status: 400 });
      await createHomeworkSubmission({
        course_id: finalCourseId,
        user_id: session.user.id,
        lesson_id: lessonId,
        submission_type: type,
        file_url: fileUrl,
        file_name: body.fileName?.trim() || null,
      });
      return NextResponse.json({ success: true, message: "تم تسليم الملف بنجاح" });
    }
  }

  if (!courseId) {
    return NextResponse.json({ error: "معرف الحصة أو الدورة مطلوب" }, { status: 400 });
  }
  const course = await getCourseById(courseId);
  if (!course || !(course as { accepts_homework?: boolean }).accepts_homework) {
    return NextResponse.json({ error: "الدورة غير موجودة أو لا تقبل تسليم واجبات" }, { status: 404 });
  }
  const canSubmitCourse =
    (await getEnrollment(session.user.id, courseId)) ||
    (await hasFullCourseAccessAsStudent(session.user.id, courseId));
  if (!canSubmitCourse) {
    return NextResponse.json({ error: "يجب التسجيل في الدورة أولاً" }, { status: 403 });
  }
  if (type === "link") {
    const linkUrl = body.linkUrl?.trim();
    if (!linkUrl || !linkUrl.startsWith("http")) {
      return NextResponse.json({ error: "رابط صالح مطلوب" }, { status: 400 });
    }
    await createHomeworkSubmission({
      course_id: courseId,
      user_id: session.user.id,
      submission_type: "link",
      link_url: linkUrl,
    });
    return NextResponse.json({ success: true, message: "تم تسليم الرابط بنجاح" });
  }
  if (type === "pdf" || type === "image") {
    const fileUrl = body.fileUrl?.trim();
    if (!fileUrl) return NextResponse.json({ error: "رابط الملف مطلوب بعد الرفع" }, { status: 400 });
    await createHomeworkSubmission({
      course_id: courseId,
      user_id: session.user.id,
      submission_type: type,
      file_url: fileUrl,
      file_name: body.fileName?.trim() || null,
    });
    return NextResponse.json({ success: true, message: "تم تسليم الملف بنجاح" });
  }
  return NextResponse.json({ error: "نوع تسليم غير صالح" }, { status: 400 });
}

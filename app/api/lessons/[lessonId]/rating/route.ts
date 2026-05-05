import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAllowedLessonIdsForUserCourse,
  getEnrollment,
  getLessonById,
  getLessonRatingSummary,
  hasFullCourseAccessAsStudent,
  upsertLessonRating,
} from "@/lib/db";

async function canAccessLesson(userId: string, role: string, lessonId: string, courseId: string): Promise<boolean> {
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN") return true;
  if (await getEnrollment(userId, courseId)) return true;
  if (role === "STUDENT") {
    if (await hasFullCourseAccessAsStudent(userId, courseId)) return true;
    const partial = await getAllowedLessonIdsForUserCourse(userId, courseId);
    if (partial.includes(lessonId)) return true;
  }
  return false;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { lessonId } = await params;
    const lesson = await getLessonById(lessonId);
    if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });

    const allowed = await canAccessLesson(session.user.id, session.user.role, lesson.id, lesson.course_id);
    if (!allowed) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const summary = await getLessonRatingSummary(lesson.id, session.user.id);
    if (!summary) return NextResponse.json({ error: "تعذر تحميل التقييم" }, { status: 500 });
    return NextResponse.json({ summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر تحميل التقييم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { lessonId } = await params;
    const lesson = await getLessonById(lessonId);
    if (!lesson) return NextResponse.json({ error: "الحصة غير موجودة" }, { status: 404 });

    const allowed = await canAccessLesson(session.user.id, session.user.role, lesson.id, lesson.course_id);
    if (!allowed) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    let body: { rating?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "التقييم يجب أن يكون من 1 إلى 5" }, { status: 400 });
    }

    await upsertLessonRating({
      lesson_id: lesson.id,
      course_id: lesson.course_id,
      user_id: session.user.id,
      rating: rating as 1 | 2 | 3 | 4 | 5,
    });

    const summary = await getLessonRatingSummary(lesson.id, session.user.id);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "تعذر حفظ التقييم";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

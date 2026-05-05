import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getQuizById,
  getEnrollment,
  countQuizAttemptsByUserAndCourse,
  createQuizAttemptReturningId,
  hasFullCourseAccessAsStudent,
} from "@/lib/db";

/** بدء محاولة اختبار: تُحسب محاولة فور الضغط على "ابدأ" */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const { quizId } = await params;
    if (!quizId || quizId.length < 20) {
      return NextResponse.json({ error: "معرّف الاختبار غير صالح" }, { status: 400 });
    }

    const result = await getQuizById(quizId);
    if (!result || !result.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const courseId = (result.quiz.courseId ?? result.quiz.course_id) as string;
    const enrolled = await getEnrollment(session.user.id, courseId);
    const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
    if (!enrolled && !fullCourse) {
      return NextResponse.json({ error: "غير مسجّل في هذه الدورة" }, { status: 403 });
    }

    const maxAttempts = result.course.max_quiz_attempts ?? result.course.maxQuizAttempts;
    let attemptsUsed = 0;
    if (typeof maxAttempts === "number" && maxAttempts > 0) {
      attemptsUsed = await countQuizAttemptsByUserAndCourse(session.user.id, courseId);
      if (attemptsUsed >= maxAttempts) {
        return NextResponse.json({ error: "تم استنفاد المحاولات" }, { status: 403 });
      }
    }

    // نبدأ المحاولة مع نتيجة 0/0 مؤقتاً، ويتم تحديثها عند التسليم
    const attemptId = await createQuizAttemptReturningId(session.user.id, quizId, 0, 0);
    return NextResponse.json({ success: true, attemptId });
  } catch (e) {
    console.error("API quizzes [quizId] start:", e);
    return NextResponse.json({ error: "حدث خطأ في بدء الاختبار" }, { status: 500 });
  }
}


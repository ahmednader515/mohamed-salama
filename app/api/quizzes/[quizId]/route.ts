import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getQuizById,
  getEnrollment,
  getAllowedQuizIdsForUserCourse,
  countQuizAttemptsByUserAndCourse,
  createQuizAttempt,
  updateQuizAttemptById,
  hasFullCourseAccessAsStudent,
} from "@/lib/db";

/**
 * جلب اختبار بالمعرّف — مع التحقق من حد المحاولات إن وُجد.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    if (!quizId || quizId.length < 20) {
      return NextResponse.json({ error: "معرّف الاختبار غير صالح" }, { status: 400 });
    }

    const result = await getQuizById(quizId);

    if (!result || !result.course) {
      return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });
    }

    const isPublished = result.course.isPublished ?? result.course.is_published;
    if (!isPublished) {
      return NextResponse.json({ error: "الدورة غير منشورة" }, { status: 404 });
    }

    const courseId = (result.quiz.courseId ?? result.quiz.course_id) as string;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }
    const role = (session.user as { role?: string }).role;
    const isStaff = role === "ADMIN" || role === "ASSISTANT_ADMIN";
    if (!isStaff) {
      const enrolled = await getEnrollment(session.user.id, courseId);
      const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
      if (!enrolled && !fullCourse) {
        const allowedQuizIds = await getAllowedQuizIdsForUserCourse(session.user.id, courseId);
        if (!allowedQuizIds.includes(quizId)) {
          return NextResponse.json({ error: "غير مسجّل في هذه الدورة أو لا تملك صلاحية لهذا الاختبار" }, { status: 403 });
        }
      }
    }

    const maxAttempts = result.course.max_quiz_attempts ?? result.course.maxQuizAttempts;
    let canAttempt = true;
    let attemptsUsed = 0;
    if (session?.user?.id && typeof maxAttempts === "number" && maxAttempts > 0) {
      const enrolled = await getEnrollment(session.user.id, courseId);
      const fullCourse = await hasFullCourseAccessAsStudent(session.user.id, courseId);
      if (enrolled || fullCourse) {
        attemptsUsed = await countQuizAttemptsByUserAndCourse(session.user.id, courseId);
        if (attemptsUsed >= maxAttempts) {
          canAttempt = false;
        }
      }
    }

    const rawLimit = result.quiz.timeLimitMinutes ?? result.quiz.time_limit_minutes;
    let timeLimitMinutes: number | null = null;
    if (rawLimit != null && rawLimit !== "") {
      const n = Math.floor(Number(rawLimit));
      if (Number.isFinite(n) && n >= 1) {
        timeLimitMinutes = Math.min(24 * 60, n);
      }
    }

    const payload = {
      id: result.quiz.id,
      title: result.quiz.title,
      courseId: result.quiz.courseId ?? result.quiz.course_id,
      order: result.quiz.order,
      timeLimitMinutes,
      course: {
        id: result.course.id,
        slug: result.course.slug,
        title: result.course.title,
        titleAr: result.course.titleAr ?? result.course.title_ar,
      },
      questions: result.questions.map((q) => ({
        id: q.id,
        type: q.type,
        questionText: q.questionText ?? q.question_text,
        order: q.order,
        options: (q.options ?? []).map((o: Record<string, unknown>) => ({
          id: o.id,
          text: o.text,
          isCorrect: o.isCorrect ?? o.is_correct,
        })),
      })),
      maxQuizAttempts: typeof maxAttempts === "number" ? maxAttempts : null,
      attemptsUsed,
      canAttempt,
    };

    if (!canAttempt) {
      return NextResponse.json(
        { error: "تم استنفاد عدد المحاولات المسموح بها لهذا الاختبار في الكورس.", ...payload },
        { status: 403 }
      );
    }

    return NextResponse.json(payload);
  } catch (e) {
    console.error("API quizzes [quizId]:", e);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الاختبار" },
      { status: 500 }
    );
  }
}

/** تسجيل نتيجة محاولة الاختبار */
export async function POST(
  request: Request,
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

    let body: { score?: number; totalQuestions?: number; attemptId?: string | null };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const score = Number(body.score ?? 0);
    const totalQuestions = Number(body.totalQuestions ?? 0);
    if (totalQuestions < 1) {
      return NextResponse.json({ error: "عدد الأسئلة غير صالح" }, { status: 400 });
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
    if (typeof maxAttempts === "number" && maxAttempts > 0) {
      const used = await countQuizAttemptsByUserAndCourse(session.user.id, courseId);
      if (used >= maxAttempts) {
        return NextResponse.json({ error: "تم استنفاد المحاولات" }, { status: 403 });
      }
    }

    const attemptId = typeof body.attemptId === "string" && body.attemptId.trim() ? body.attemptId.trim() : null;
    if (attemptId) {
      const ok = await updateQuizAttemptById({
        attemptId,
        userId: session.user.id,
        quizId,
        score,
        totalQuestions,
      });
      if (!ok) {
        await createQuizAttempt(session.user.id, quizId, score, totalQuestions);
      }
    } else {
      await createQuizAttempt(session.user.id, quizId, score, totalQuestions);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("API quizzes [quizId] POST:", e);
    return NextResponse.json({ error: "حدث خطأ في تسجيل النتيجة" }, { status: 500 });
  }
}

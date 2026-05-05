import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import {
  getCourseById,
  getCourseForEdit,
  updateCourse,
  deleteCourse,
  deleteLessonsByCourseId,
  deleteQuizzesByCourseId,
  createLesson,
  createQuiz,
  createQuestion,
  createQuestionOption,
  findCategoryByNameForDashboard,
  createCategory,
  categoryIsManageableOnDashboard,
} from "@/lib/db";

type LessonInput = { title: string; titleAr?: string; videoUrl?: string; content?: string; pdfUrl?: string; acceptsHomework?: boolean };
type QuestionOptionInput = { text: string; isCorrect: boolean };
type QuestionInput = { type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE"; questionText: string; options?: QuestionOptionInput[] };
type QuizInput = { title: string; timeLimitMinutes?: number | null; questions: QuestionInput[] };
type ContentOrderEntry = { type: "lesson"; index: number } | { type: "quiz"; index: number };

/** تحديث دورة - للأدمن ومساعد الأدمن */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  let body: {
    title?: string;
    titleAr?: string;
    titleEn?: string;
    description?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    shortDesc?: string;
    shortDescAr?: string;
    shortDescEn?: string;
    imageUrl?: string;
    price?: number;
    isPublished?: boolean;
    maxQuizAttempts?: number | null;
    categoryId?: string | null;
    categoryName?: string;
    categoryNameAr?: string;
    categoryNameEn?: string;
    acceptsHomework?: boolean;
    lessons?: LessonInput[];
    quizzes?: QuizInput[];
    contentOrder?: ContentOrderEntry[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const course = await getCourseById(id);
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const createdBy = (course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null;
  if (!canManageCourse(session.user.role, session.user.id, createdBy)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const slug = (course as { slug?: string }).slug ?? "";

  const titleAr = (body.titleAr ?? body.title)?.trim();
  const titleEn = (body.titleEn ?? body.title)?.trim();
  const descriptionAr = (body.descriptionAr ?? body.description)?.trim();
  const descriptionEn = (body.descriptionEn ?? "").trim();
  if (!titleAr || !titleEn || !descriptionAr || !descriptionEn) {
    return NextResponse.json({ error: "العنوان والوصف بالعربية والإنجليزية مطلوبان" }, { status: 400 });
  }

  const role = session.user.role;
  const currentCategoryId =
    (course as { categoryId?: string | null }).categoryId ??
    (course as { category_id?: string | null }).category_id ??
    null;

  let categoryId: string | null | undefined = body.categoryId;
  const catNameAr = (body.categoryNameAr ?? body.categoryName)?.trim();
  const catNameEn = (body.categoryNameEn ?? body.categoryName)?.trim();
  if (catNameAr || catNameEn) {
    let cat =
      (catNameAr ? await findCategoryByNameForDashboard(catNameAr, session.user.id, role) : null) ??
      (catNameEn ? await findCategoryByNameForDashboard(catNameEn, session.user.id, role) : null);
    if (!cat) {
      const slugBase = catNameEn || catNameAr || "cat";
      const slugCat = slugBase.toLowerCase().replace(/\s+/g, "-").replace(/[^\w\u0600-\u06FF-]+/g, "") || "cat";
      const uniqueSlug = slugCat + "-" + Date.now();
      cat = await createCategory({
        name: catNameEn || catNameAr || slugBase,
        name_ar: catNameAr || catNameEn || slugBase,
        slug: uniqueSlug,
        created_by_id: session.user.id,
      });
    }
    categoryId = cat.id;
  } else if (body.categoryId !== undefined) {
    if (body.categoryId === null || body.categoryId === "") {
      categoryId = null;
    } else {
      const incoming = String(body.categoryId).trim();
      if (incoming !== currentCategoryId) {
        const ok = await categoryIsManageableOnDashboard(incoming, session.user.id, role);
        if (!ok) {
          return NextResponse.json({ error: "القسم غير صالح أو غير مسموح" }, { status: 400 });
        }
      }
      categoryId = incoming;
    }
  }

  await updateCourse(id, {
    title: titleEn,
    title_ar: titleAr,
    description: descriptionAr,
    description_en: descriptionEn,
    short_desc: (body.shortDescAr ?? body.shortDesc)?.trim() || null,
    short_desc_en: (body.shortDescEn ?? "").trim() || null,
    image_url: body.imageUrl?.trim() || null,
    price: body.price ?? 0,
    is_published: body.isPublished ?? true,
    max_quiz_attempts: body.maxQuizAttempts ?? null,
    ...(categoryId !== undefined && { category_id: categoryId }),
    ...(body.acceptsHomework !== undefined && { accepts_homework: body.acceptsHomework }),
  });

  await deleteLessonsByCourseId(id);
  const lessons = body.lessons ?? [];
  const quizzes = body.quizzes ?? [];
  const contentOrder =
    body.contentOrder ??
    ([
      ...lessons.map((_, i) => ({ type: "lesson" as const, index: i })),
      ...quizzes.map((_, i) => ({ type: "quiz" as const, index: i })),
    ] satisfies ContentOrderEntry[]);

  for (let i = 0; i < lessons.length; i++) {
    const le = lessons[i];
    const lessonSlug = `${slug}-${i + 1}`.replace(/\s+/g, "-");
    const order = contentOrder.findIndex((e) => e.type === "lesson" && e.index === i);
    const orderVal = order >= 0 ? order : i;
    await createLesson({
      course_id: id,
      title: le.title?.trim() || `حصة ${i + 1}`,
      title_ar: le.titleAr?.trim() || null,
      slug: lessonSlug,
      content: le.content?.trim() || null,
      video_url: le.videoUrl?.trim() || null,
      pdf_url: le.pdfUrl?.trim() || null,
      order: orderVal,
      accepts_homework: !!le.acceptsHomework,
    });
  }

  await deleteQuizzesByCourseId(id);
  for (let qi = 0; qi < quizzes.length; qi++) {
    const q = quizzes[qi];
    const mins = q.timeLimitMinutes;
    const timeLimitMinutes =
      typeof mins === "number" && Number.isFinite(mins) && mins >= 1 ? mins : null;
    const order = contentOrder.findIndex((e) => e.type === "quiz" && e.index === qi);
    const orderVal = order >= 0 ? order : lessons.length + qi;
    const quiz = await createQuiz({
      course_id: id,
      title: q.title?.trim() || `اختبار ${qi + 1}`,
      order: orderVal,
      time_limit_minutes: timeLimitMinutes,
    });
    const questions = q.questions ?? [];
    for (let qti = 0; qti < questions.length; qti++) {
      const qt = questions[qti];
      const qType = qt.type === "ESSAY" ? "ESSAY" : qt.type === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE";
      const question = await createQuestion({
        quiz_id: quiz.id,
        type: qType,
        question_text: qt.questionText?.trim() || "",
        order: qti + 1,
      });
      if ((qt.type === "MULTIPLE_CHOICE" || qt.type === "TRUE_FALSE") && Array.isArray(qt.options)) {
        for (const opt of qt.options) {
          await createQuestionOption({
            question_id: question.id,
            text: opt.text?.trim() || "",
            is_correct: !!opt.isCorrect,
          });
        }
      }
    }
  }

  return NextResponse.json({ success: true });
}

/** جلب دورة كاملة للتعديل - للأدمن ومساعد الأدمن */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;
  const data = await getCourseForEdit(id);
  if (!data?.course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const c0 = data.course as { createdById?: string | null; created_by_id?: string | null };
  const createdBy = c0.createdById ?? c0.created_by_id ?? null;
  if (!canManageCourse(session.user.role, session.user.id, createdBy)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const c = data.course;
  const payload = {
    id: c.id,
    title: c.title,
    titleEn: c.title,
    titleAr: c.titleAr ?? c.title_ar,
    slug: c.slug,
    description: c.description,
    descriptionAr: c.description,
    descriptionEn: (c as { descriptionEn?: string | null; description_en?: string | null }).descriptionEn ?? (c as { description_en?: string | null }).description_en ?? "",
    shortDesc: c.shortDesc ?? c.short_desc,
    shortDescAr: c.shortDesc ?? c.short_desc ?? "",
    shortDescEn: (c as { shortDescEn?: string | null; short_desc_en?: string | null }).shortDescEn ?? (c as { short_desc_en?: string | null }).short_desc_en ?? "",
    imageUrl: c.imageUrl ?? c.image_url,
    price: Number(c.price ?? 0),
    isPublished: c.isPublished ?? c.is_published ?? true,
    maxQuizAttempts: c.maxQuizAttempts ?? c.max_quiz_attempts ?? null,
    categoryId: (c as { categoryId?: string | null }).categoryId ?? null,
    lessons: data.lessons.map((l) => ({
      title: l.title,
      titleAr: l.titleAr ?? l.title_ar,
      videoUrl: l.videoUrl ?? l.video_url,
      content: l.content,
      pdfUrl: l.pdfUrl ?? l.pdf_url,
      acceptsHomework: Boolean((l as { acceptsHomework?: boolean; accepts_homework?: boolean }).acceptsHomework ?? (l as { accepts_homework?: boolean }).accepts_homework ?? false),
    })),
    quizzes: data.quizzes.map((q) => ({
      title: q.title,
      timeLimitMinutes: (q as { timeLimitMinutes?: number | null }).timeLimitMinutes ?? null,
      questions: (q.questions ?? []).map((qt) => ({
        type: qt.type,
        questionText: qt.questionText ?? qt.question_text,
        options: (qt.options ?? []).map((o) => ({ text: o.text, isCorrect: o.isCorrect ?? o.is_correct })),
      })),
    })),
  };
  return NextResponse.json(payload);
}

/** حذف دورة - للأدمن ومساعد الأدمن. يحذف التسجيلات والحصص والاختبارات تلقائياً (Cascade) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id } = await params;

  const course = await getCourseById(id);
  if (!course) {
    return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
  }
  const createdByDel = (course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null;
  if (!canManageCourse(session.user.role, session.user.id, createdByDel)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  await deleteCourse(id);

  return NextResponse.json({ success: true });
}

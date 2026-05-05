import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCoursesPublished,
  courseExistsBySlug,
  createCourse,
  createLesson,
  createQuiz,
  createQuestion,
  createQuestionOption,
  findCategoryByNameForDashboard,
  createCategory,
  categoryIsManageableOnDashboard,
} from "@/lib/db";

export async function GET() {
  try {
    const courses = await getCoursesPublished(true);
    return NextResponse.json(courses);
  } catch (error) {
    console.error("API courses:", error);
    return NextResponse.json(
      { error: "فشل جلب الدورات" },
      { status: 500 }
    );
  }
}

type LessonInput = { title: string; titleAr?: string; videoUrl?: string; content?: string; pdfUrl?: string };
type QuestionOptionInput = { text: string; isCorrect: boolean };
type QuestionInput = { type: "MULTIPLE_CHOICE" | "ESSAY" | "TRUE_FALSE"; questionText: string; options?: QuestionOptionInput[] };
type QuizInput = { title: string; timeLimitMinutes?: number | null; questions: QuestionInput[] };

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  let body: {
    title?: string;
    titleAr?: string;
    titleEn?: string;
    slug: string;
    description?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    shortDesc?: string;
    shortDescAr?: string;
    shortDescEn?: string;
    imageUrl?: string;
    price?: number;
    maxQuizAttempts?: number | null;
    categoryId?: string | null;
    categoryName?: string;
    categoryNameAr?: string;
    categoryNameEn?: string;
    acceptsHomework?: boolean;
    lessons?: LessonInput[];
    quizzes?: QuizInput[];
    contentOrder?: Array<{ type: "lesson"; index: number } | { type: "quiz"; index: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const titleAr = (body.titleAr ?? body.title)?.trim();
  const titleEn = (body.titleEn ?? body.title)?.trim();
  const slug = body.slug?.trim();
  const descriptionAr = (body.descriptionAr ?? body.description)?.trim();
  const descriptionEn = (body.descriptionEn ?? "").trim();
  if (!titleAr || !titleEn || !slug || !descriptionAr || !descriptionEn) {
    return NextResponse.json({ error: "العنوان والوصف بالعربية والإنجليزية مطلوبة" }, { status: 400 });
  }

  const exists = await courseExistsBySlug(slug.trim());
  if (exists) {
    return NextResponse.json({ error: "رابط الدورة مستخدم مسبقاً" }, { status: 400 });
  }

  let categoryId: string | null = null;
  const catNameAr = (body.categoryNameAr ?? body.categoryName)?.trim();
  const catNameEn = (body.categoryNameEn ?? body.categoryName)?.trim();
  const role = session.user.role;
  if (catNameAr || catNameEn) {
    let cat =
      (catNameAr ? await findCategoryByNameForDashboard(catNameAr, session.user.id, role) : null) ??
      (catNameEn ? await findCategoryByNameForDashboard(catNameEn, session.user.id, role) : null);
    if (!cat) {
      const slugBase = (catNameEn || catNameAr || "cat");
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
  } else if (body.categoryId?.trim()) {
    const cid = body.categoryId.trim();
    const ok = await categoryIsManageableOnDashboard(cid, session.user.id, role);
    if (!ok) {
      return NextResponse.json({ error: "القسم غير صالح أو غير مسموح" }, { status: 400 });
    }
    categoryId = cid;
  }

  let course;
  try {
    course = await createCourse({
      title: titleEn,
      title_ar: titleAr,
      slug,
      description: descriptionAr,
      description_en: descriptionEn,
      short_desc: (body.shortDescAr ?? body.shortDesc)?.trim() || null,
      short_desc_en: (body.shortDescEn ?? "").trim() || null,
      image_url: body.imageUrl?.trim() || null,
      price: body.price ?? 0,
      is_published: true,
      created_by_id: session.user.id,
      max_quiz_attempts: body.maxQuizAttempts ?? null,
      category_id: categoryId,
      accepts_homework: !!body.acceptsHomework,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("createCourse error:", err);
    if (msg.includes("foreign key") || msg.includes("فشل إنشاء الدورة")) {
      return NextResponse.json(
        { error: "فشل إنشاء الدورة. جرّب تسجيل الخروج ثم الدخول مرة أخرى (حسابك قد لا يكون في قاعدة البيانات الحالية)." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: msg || "فشل إنشاء الدورة" },
      { status: 500 }
    );
  }

  const lessons = body.lessons ?? [];
  const quizzes = body.quizzes ?? [];
  const contentOrder = body.contentOrder ?? [
    ...lessons.map((_, i) => ({ type: "lesson" as const, index: i })),
    ...quizzes.map((_, i) => ({ type: "quiz" as const, index: i })),
  ];

  for (let i = 0; i < lessons.length; i++) {
    const le = lessons[i];
    const lessonSlug = `${slug.trim()}-${i + 1}`.replace(/\s+/g, "-");
    const order = contentOrder.findIndex((e) => e.type === "lesson" && e.index === i);
    const orderVal = order >= 0 ? order : i;
    await createLesson({
      course_id: course.id,
      title: le.title?.trim() || `حصة ${i + 1}`,
      title_ar: (le as { titleAr?: string }).titleAr?.trim() || null,
      slug: lessonSlug,
      content: le.content?.trim() || null,
      video_url: le.videoUrl?.trim() || null,
      pdf_url: le.pdfUrl?.trim() || null,
      order: orderVal,
      accepts_homework: !!(le as { acceptsHomework?: boolean }).acceptsHomework,
    });
  }

  for (let qi = 0; qi < quizzes.length; qi++) {
    const q = quizzes[qi];
    const order = contentOrder.findIndex((e) => e.type === "quiz" && e.index === qi);
    const orderVal = order >= 0 ? order : lessons.length + qi;
    const mins = q.timeLimitMinutes;
    const timeLimitMinutes =
      typeof mins === "number" && Number.isFinite(mins) && mins >= 1 ? mins : null;
    const quiz = await createQuiz({
      course_id: course.id,
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

  return NextResponse.json({ id: course.id, title: course.title, slug: course.slug });
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCourseWithContent,
  getEnrollment,
  getAllowedLessonIdsForUserCourse,
  getAllowedQuizIdsForUserCourse,
  getUserById,
  getLiveStreamsByCourseId,
  getHomepageSettings,
  hasFullCourseAccessAsStudent,
  userHasActivePlatformSubscriptionForPaidCourse,
  getLatestPlatformSubscriptionExpiry,
} from "@/lib/db";
import { EnrollButton } from "./EnrollButton";
import { getLocaleFromCookie, getServerTranslator } from "@/lib/i18n/server";
import { pickLocalizedText } from "@/lib/i18n/localized-field";

type Props = { params: Promise<{ slug: string }> };

/** عدم التخزين المؤقت — دائماً التحقق من وجود الدورة (تجنب 404 للدورات المحذوفة) */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isCourseId(segment: string): boolean {
  return /^c[a-z0-9]{24}$/i.test(segment);
}

function decodeSlug(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** توحيد الـ slug في الروابط (إزالة الشرطات الزائدة) ليتطابق مع صفحة الاختبار على Vercel */
function normalizeSlugForUrl(s: string | null | undefined): string {
  if (!s || !s.trim()) return "";
  return s.trim().replace(/-+$/, "").replace(/^-+/, "");
}

export async function generateMetadata({ params }: Props) {
  const [t, locale] = await Promise.all([getServerTranslator(), getLocaleFromCookie()]);
  const { slug: segment } = await params;
  unstable_noStore();
  const decoded = decodeSlug(segment);
  const data = await getCourseWithContent(decoded);
  const course = data?.course;
  if (!course) return { title: t("courses.notFoundCourse", "Course not found") };
  const courseTitle = pickLocalizedText(
    locale,
    (course as { titleAr?: string | null; title?: string | null }).titleAr ?? null,
    (course as { title?: string | null }).title ?? null,
  );
  const courseDescription = pickLocalizedText(
    locale,
    (course as { shortDesc?: string | null; description?: string | null }).shortDesc ??
      (course as { description?: string | null }).description ??
      null,
    (course as { shortDescEn?: string | null; short_desc_en?: string | null }).shortDescEn ??
      (course as { short_desc_en?: string | null }).short_desc_en ??
      null,
  );
  return {
    title: `${courseTitle} | ${t("footer.defaultTitle", "My Learning Platform")}`,
    description: courseDescription,
  };
}

export default async function CoursePage({ params }: Props) {
  unstable_noStore();
  const t = await getServerTranslator();
  const locale = await getLocaleFromCookie();
  const { slug: segment } = await params;
  const decoded = decodeSlug(segment);
  const session = await getServerSession(authOptions);
  let data: Awaited<ReturnType<typeof getCourseWithContent>> = null;
  let isEnrolled = false;
  let allowedLessonIds: string[] = [];
  let allowedQuizIds: string[] = [];
  let userBalance = 0;
  let hasFullStudentAccess = false;
  let paidCourseCoveredBySubscription = false;
  let subscriptionExpiresAt: Date | null = null;
  try {
    data = await getCourseWithContent(decoded);
    if (data?.course && session?.user?.id && session.user.role === "STUDENT") {
      const [en, user, lessons, quizzes, fullAccess, subPaid] = await Promise.all([
        getEnrollment(session.user.id, data.course.id),
        getUserById(session.user.id),
        getAllowedLessonIdsForUserCourse(session.user.id, data.course.id),
        getAllowedQuizIdsForUserCourse(session.user.id, data.course.id),
        hasFullCourseAccessAsStudent(session.user.id, data.course.id),
        userHasActivePlatformSubscriptionForPaidCourse(session.user.id, data.course.id),
      ]);
      isEnrolled = !!en;
      if (!isEnrolled) {
        allowedLessonIds = lessons;
        allowedQuizIds = quizzes;
      }
      userBalance = Number(user?.balance) || 0;
      hasFullStudentAccess = fullAccess;
      paidCourseCoveredBySubscription = subPaid && !isEnrolled;
      if (paidCourseCoveredBySubscription) {
        subscriptionExpiresAt = await getLatestPlatformSubscriptionExpiry(session.user.id);
      }
    }
  } catch {
    notFound();
  }
  if (!data?.course) notFound();

  const course = {
    ...data.course,
    lessons: data.lessons,
    quizzes: data.quizzes,
  };
  const title = pickLocalizedText(
    locale,
    (course as { titleAr?: string | null; title?: string | null }).titleAr ?? null,
    (course as { title?: string | null }).title ?? null,
  );
  const categoryName = pickLocalizedText(
    locale,
    (course.category as { nameAr?: string | null; name?: string | null })?.nameAr ?? null,
    (course.category as { name?: string | null })?.name ?? null,
  );
  const courseDescription = pickLocalizedText(
    locale,
    (course as { description?: string | null }).description ?? null,
    (course as { descriptionEn?: string | null; description_en?: string | null }).descriptionEn ??
      (course as { description_en?: string | null }).description_en ??
      null,
  );
  const canEnroll =
    session?.user?.role === "STUDENT" && !isEnrolled && !paidCourseCoveredBySubscription;
  const hasPartialAccess = allowedLessonIds.length > 0 || allowedQuizIds.length > 0;
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "ASSISTANT_ADMIN";
  const canAccessContent =
    isStaff || hasPartialAccess || (session?.user?.role === "STUDENT" && hasFullStudentAccess);
  const canAccessQuizzes = isStaff || (session?.user?.role === "STUDENT" && hasFullStudentAccess);
  const coursePrice = Number((course as Record<string, unknown>).price) || 0;

  const liveStreams = canAccessContent ? await getLiveStreamsByCourseId(course.id) : [];
  const homepageSettings = await getHomepageSettings();
  const formatStreamDate = (d: Date | string) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
  };

  const isGuest = !session;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Link
        href="/courses"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← {t("common.backToCourses", "Back to courses")}
      </Link>

      {isGuest && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-4 py-3 sm:px-5 sm:py-4">
          <p className="text-sm font-medium text-[var(--color-foreground)] sm:text-base">
            {t("courses.enrollLoginPrompt", "Log in or create an account to view this course content and enroll.")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(`/courses/${decodeURIComponent(segment)}`)}`}
              className="inline-flex rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-border)]/50"
            >
              {t("header.login", "Log in")}
            </Link>
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(`/courses/${decodeURIComponent(segment)}`)}`}
              className="inline-flex rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)]"
            >
              {t("header.register", "Create account")}
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* قسم المدرس */}
        <aside className="order-2 lg:order-1">
          <div className="sticky top-24 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                <img
                  src={homepageSettings.teacherImageUrl?.trim() || "/instructor.png"}
                  alt={pickLocalizedText(locale, homepageSettings.heroTitle, homepageSettings.heroTitleEn) || "المدرس"}
                  className="h-32 w-32 border-2 border-black border-dotted object-cover"
                />
                <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-4 border-[var(--color-surface)] bg-[var(--color-success)]" />
                <img
                  src={homepageSettings.heroFloatImage1 || "/images/ruler.png"}
                  alt=""
                  className="float-icon float-icon-1 absolute -left-8 top-0 h-9 w-9 object-contain drop-shadow sm:-left-9 sm:h-10 sm:w-10"
                  aria-hidden
                />
                <img
                  src={homepageSettings.heroFloatImage2 || "/images/notebook.png"}
                  alt=""
                  className="float-icon float-icon-2 absolute -right-8 bottom-2 h-9 w-9 object-contain drop-shadow sm:-right-9 sm:h-10 sm:w-10"
                  aria-hidden
                />
                <img
                  src={homepageSettings.heroFloatImage3 || "/images/pencil.png"}
                  alt=""
                  className="float-icon float-icon-3 absolute -bottom-2 left-1 h-8 w-8 object-contain drop-shadow sm:left-2 sm:h-9 sm:w-9"
                  aria-hidden
                />
              </div>
              <div className="mt-2 w-full border-t border-[var(--color-border)] pt-4">
                <p className="text-sm text-[var(--color-muted)]">
                  {pickLocalizedText(locale, homepageSettings.heroSlogan, homepageSettings.heroSloganEn) ||
                    t("courses.allCoursesSubtitle", "Choose the right course and start learning step by step")}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* محتوى الكورس */}
        <article className="order-1 lg:order-2">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
          <div className="aspect-video w-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary-light)]/30 flex items-center justify-center overflow-hidden">
            {(course as Record<string, unknown>).imageUrl ?? (course as Record<string, unknown>).image_url ? (
              <img
                src={String((course as Record<string, unknown>).imageUrl ?? (course as Record<string, unknown>).image_url)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-6xl opacity-50">📚</span>
            )}
          </div>
          <div className="p-6 sm:p-8">
            {categoryName && (
              <span className="text-sm font-medium text-[var(--color-primary)]">
                {categoryName}
              </span>
            )}
            <h1 className="mt-2 text-3xl font-bold text-[var(--color-foreground)]">
              {title}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2">
              {coursePrice > 0 && (
                <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-sm font-semibold text-[var(--color-primary)]">
                  {coursePrice.toFixed(2)} {t("common.egyptianPoundShort", "EGP")}
                </span>
              )}
              {(course as Record<string, unknown>).duration ? (
                <span className="rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-sm text-[var(--color-primary)]">
                  ⏱ {(course as Record<string, unknown>).duration as string}
                </span>
              ) : null}
              {(course as Record<string, unknown>).level ? (
                <span className="rounded-full bg-[var(--color-border)] px-3 py-1 text-sm text-[var(--color-muted)]">
                  {(course as Record<string, unknown>).level === "beginner" && t("common.beginner", "Beginner")}
                  {(course as Record<string, unknown>).level === "intermediate" && t("common.intermediate", "Intermediate")}
                  {(course as Record<string, unknown>).level === "advanced" && t("common.advanced", "Advanced")}
                </span>
              ) : null}
            </div>
            <div className="mt-6 prose-custom text-[var(--color-foreground)]">
              <p>{courseDescription}</p>
            </div>

            {liveStreams.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {t("courses.liveStreams", "Live streams")}
                </h2>
                <ul className="mt-4 space-y-3">
                  {(liveStreams as unknown as Record<string, unknown>[]).map((ls) => (
                    <li
                      key={String(ls.id)}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
                    >
                      <div>
                        <span className="font-medium text-[var(--color-foreground)]">
                          {String(ls.title_ar ?? ls.titleAr ?? ls.title ?? "")}
                        </span>
                        <span className="mr-2 text-sm text-[var(--color-muted)]">
                          {ls.provider === "google_meet" ? "Google Meet" : "Zoom"} — {formatStreamDate((ls.scheduled_at ?? ls.scheduledAt) as string | Date || new Date())}
                        </span>
                      </div>
                      <a
                        href={String(ls.meeting_url ?? ls.meetingUrl ?? "#")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                      >
                        {t("courses.joinStream", "Join stream")}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {canEnroll && (
              <EnrollButton
                courseId={course.id}
                coursePrice={coursePrice}
                userBalance={userBalance}
              />
            )}
            {isEnrolled && (
              <p className="mt-4 rounded-[var(--radius-btn)] bg-[var(--color-primary-light)]/50 px-4 py-2 text-sm text-[var(--color-primary)]">
                ✓ {t("courses.youAreEnrolled", "You are enrolled in this course.")} <Link href="/dashboard" className="font-medium underline">{t("dashboard.title", "Dashboard")}</Link>
              </p>
            )}

            {paidCourseCoveredBySubscription && subscriptionExpiresAt && (
              <p className="mt-4 rounded-[var(--radius-btn)] border border-teal-500/40 bg-teal-500/10 px-4 py-2 text-sm text-teal-900 dark:text-teal-100">
                {t("courses.viaPlatformSubscription", "You are viewing this course through platform subscription until")}{" "}
                {new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(subscriptionExpiresAt)}.
              </p>
            )}

            {hasPartialAccess && !isEnrolled && !hasFullStudentAccess && (
              <div className="mt-6 rounded-[var(--radius-card)] border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
                {t("courses.partialAccessInfo", "This course is available to you through a code that unlocks specific lessons/quizzes.")}
              </div>
            )}

            {course.lessons.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {t("courses.courseContent", "Course content")} ({course.lessons.length} {t("courses.lessonsCount", "lessons")})
                </h2>
                <ul className="mt-4 space-y-2">
                  {(hasPartialAccess && !isEnrolled && !isStaff
                    ? course.lessons.filter((l) => allowedLessonIds.includes(String((l as Record<string, unknown>).id ?? l.id)))
                    : course.lessons
                  ).map((lesson, i) => {
                    const lessonClassName = `flex items-center gap-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 ${canAccessContent ? "transition hover:border-[var(--color-primary)]/30" : ""}`;
                    const content = (
                      <>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/20 text-sm font-medium text-[var(--color-primary)]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-[var(--color-foreground)]">
                            {String((lesson as Record<string, unknown>).titleAr ?? (lesson as Record<string, unknown>).title ?? "")}
                          </span>
                          {(lesson as Record<string, unknown>).duration ? (
                            <span className="mr-2 text-sm text-[var(--color-muted)]">
                              • {String((lesson as Record<string, unknown>).duration)} {t("courses.minutes", "minutes")}
                            </span>
                          ) : null}
                          {(lesson as Record<string, unknown>).videoUrl && canAccessContent ? (
                            <span className="mr-2 text-xs text-[var(--color-primary)]">▶ {t("courses.videoTag", "Video")}</span>
                          ) : null}
                        </div>
                      </>
                    );
                    const courseSlugOrId = String((course as Record<string, unknown>).slug ?? "").trim() || String((course as Record<string, unknown>).id ?? course.id);
                    const lessonSlugOrId = (lesson as Record<string, unknown>).slug && String((lesson as Record<string, unknown>).slug).trim()
                      ? encodeURIComponent(String((lesson as Record<string, unknown>).slug).trim())
                      : String((lesson as Record<string, unknown>).id ?? lesson.id);
                    return (
                      <li key={String(lesson.id)}>
                        {canAccessContent ? (
                          <Link
                            href={`/courses/${courseSlugOrId}/lessons/${lessonSlugOrId}`}
                            className={lessonClassName}
                          >
                            {content}
                          </Link>
                        ) : (
                          <div className={lessonClassName}>
                            {content}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {course.quizzes && course.quizzes.length > 0 && (
              <div className="mt-10">
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {t("courses.quizzes", "Quizzes")} ({course.quizzes.length})
                </h2>
                <ul className="mt-4 space-y-2">
                  {course.quizzes.map((quiz, i) => {
                    const q = quiz as Record<string, unknown> & { _count?: { questions?: number } };
                    const questionsCount = q._count?.questions ?? 0;
                    return (
                    <li key={String(q.id)}>
                      {canAccessQuizzes ? (
                        <Link
                          href={`/courses/${encodeURIComponent(normalizeSlugForUrl(String((course as Record<string, unknown>).slug ?? "")) || String((course as Record<string, unknown>).id ?? course.id))}/quizzes/${String(q.id)}`}
                          className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 transition hover:border-[var(--color-primary)]/30"
                        >
                          <span className="font-medium text-[var(--color-foreground)]">{String(q.title ?? "")}</span>
                          <span className="text-sm text-[var(--color-muted)]">{questionsCount} {t("courses.questions", "questions")}</span>
                        </Link>
                      ) : (
                        <div className="flex items-center justify-between rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 opacity-75">
                          <span className="font-medium text-[var(--color-foreground)]">{String(q.title ?? "")}</span>
                          <span className="text-sm text-[var(--color-muted)]">{questionsCount} {t("courses.questions", "questions")}</span>
                        </div>
                      )}
                    </li>
                  );})}
                </ul>
              </div>
            )}
          </div>
        </div>
        </article>
      </div>
    </div>
  );
}

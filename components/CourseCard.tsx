"use client";

import Link from "next/link";
import { useLocale, useT } from "./LocaleProvider";

function normalizeCoursePrice(
  price: number | { toNumber?: () => number } | string | undefined,
): number | null {
  if (price === undefined || price === null || price === "") return null;
  if (typeof price === "object" && price !== null && typeof price.toNumber === "function") {
    const n = price.toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(price);
  return Number.isFinite(n) ? n : null;
}

type Course = {
  id: string;
  title: string;
  titleAr?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  duration?: string | null;
  level?: string | null;
  imageUrl?: string | null;
  price?: number | { toNumber?: () => number } | string;
  courseRating?: number | { toNumber?: () => number } | string | null;
  courseRatingCount?: number | { toNumber?: () => number } | string | null;
  category?: { name: string; nameAr?: string | null } | null;
};

export function CourseCard({ course }: { course: Course }) {
  const locale = useLocale();
  const t = useT();
  const displayTitle = locale === "en" ? (course.title || course.titleAr) : (course.titleAr || course.title);
  const categoryName =
    locale === "en"
      ? (course.category?.name || course.category?.nameAr)
      : (course.category?.nameAr || course.category?.name);
  const shortDescription =
    locale === "en" ? (course.shortDescEn || course.shortDesc) : (course.shortDesc || course.shortDescEn);
  const slugOrId = (course.slug && course.slug.trim()) ? encodeURIComponent(course.slug.trim()) : course.id;
  const href = slugOrId ? `/courses/${slugOrId}` : "/courses";
  const priceValue = normalizeCoursePrice(course.price);
  const courseRatingValue = normalizeCoursePrice(course.courseRating ?? undefined);
  const courseRatingCountValue = normalizeCoursePrice(course.courseRatingCount ?? undefined);
  const hasCourseRating =
    courseRatingValue !== null &&
    courseRatingValue > 0 &&
    courseRatingCountValue !== null &&
    courseRatingCountValue > 0;
  const priceDisplay =
    priceValue !== null && priceValue > 0 ? priceValue.toFixed(2) : null;
  const isPaid = priceDisplay !== null;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-hover)] hover:border-[var(--color-primary)]/30"
    >
      <div className="aspect-video w-full bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-primary-light)]/30 flex items-center justify-center">
        {course.imageUrl ? (
          <img
            src={course.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl opacity-50">📚</span>
        )}
      </div>
      <div className="p-5">
        {categoryName && (
          <span className="text-xs font-medium text-[var(--color-primary)]">
            {categoryName}
          </span>
        )}
        <h3 className="mt-1 text-lg font-semibold text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
          {displayTitle}
        </h3>
        {shortDescription && (
          <p className="mt-2 line-clamp-2 text-sm text-[var(--color-muted)]">
            {shortDescription}
          </p>
        )}
        {/* السعر أولًا في DOM ليظهر على يمين الصف في RTL */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="shrink-0">
            {isPaid ? (
              <span
                className="inline-flex items-stretch overflow-hidden rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
                dir="ltr"
              >
                <span className="flex items-center px-2.5 py-2 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                  {priceDisplay}
                </span>
                <span className="flex items-center border-s border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-surface))] px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                  {t("common.egyptianPoundShort", "EGP")}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center rounded-[var(--radius-btn)] border border-[var(--color-success)]/35 bg-[color-mix(in_srgb,var(--color-success)_12%,var(--color-surface))] px-2.5 py-2 text-xs font-semibold text-[var(--color-success)]">
                {t("common.free", "Free")}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
            {hasCourseRating ? (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                ★ {courseRatingValue.toFixed(1)} ({Math.round(courseRatingCountValue)})
              </span>
            ) : (
              <span className="rounded-full bg-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)]">
                {t("courses.noRatings", "No ratings yet")}
              </span>
            )}
            {course.duration && (
              <span className="rounded-full bg-[var(--color-primary-light)]/55 px-2.5 py-1 text-xs text-[var(--color-primary)]">
                ⏱ {course.duration}
              </span>
            )}
            {course.level && (
              <span className="rounded-full bg-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-muted)]">
                {course.level === "beginner" && t("common.beginner", "Beginner")}
                {course.level === "intermediate" && t("common.intermediate", "Intermediate")}
                {course.level === "advanced" && t("common.advanced", "Advanced")}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

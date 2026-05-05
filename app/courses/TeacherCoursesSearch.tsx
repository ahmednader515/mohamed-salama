"use client";

import { useMemo, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { useLocale, useT } from "@/components/LocaleProvider";

type CategoryShape = {
  slug?: string;
  name?: string;
  nameAr?: string | null;
  name_ar?: string | null;
} | null;

export type TeacherCourseListItem = {
  id: string;
  title: string;
  titleAr?: string | null;
  title_ar?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  shortDescEn?: string | null;
  short_desc?: string | null;
  short_desc_en?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  price?: unknown;
  courseRating?: unknown;
  courseRatingCount?: unknown;
  course_rating?: unknown;
  course_rating_count?: unknown;
  duration?: string | null;
  level?: string | null;
  category?: CategoryShape;
};

function normalizeSearch(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function categoryLabel(cat: CategoryShape): string {
  if (!cat) return "بدون تصنيف";
  const ar = (cat.nameAr ?? cat.name_ar)?.trim();
  if (ar) return ar;
  const n = cat.name?.trim();
  if (n) return n;
  return "بدون تصنيف";
}

function groupCoursesByCategory(courses: TeacherCourseListItem[]) {
  const map = new Map<string, { label: string; courses: TeacherCourseListItem[] }>();
  const order: string[] = [];
  for (const course of courses) {
    const cat = course.category ?? null;
    const key = cat?.slug?.trim() || "__uncategorized__";
    const label = categoryLabel(cat);
    let entry = map.get(key);
    if (!entry) {
      entry = { label, courses: [] };
      map.set(key, entry);
      order.push(key);
    }
    entry.courses.push(course);
  }
  return order.map((slugKey) => {
    const { label, courses: groupCourses } = map.get(slugKey)!;
    return { slugKey, label, courses: groupCourses };
  });
}

/** مطابقة نص البحث مع اسم الدورة أو الوصف القصير أو القسم (اسم / معرّف slug) */
export function courseMatchesSearchQuery(course: TeacherCourseListItem, rawQuery: string) {
  const q = normalizeSearch(rawQuery);
  if (!q) return true;
  const titleAr = (course.titleAr ?? course.title_ar ?? "").toLowerCase();
  const title = (course.title ?? "").toLowerCase();
  const short = (course.shortDesc ?? course.short_desc ?? "").toLowerCase();
  const shortEn = (course.shortDescEn ?? course.short_desc_en ?? "").toLowerCase();
  const slug = (course.slug ?? "").toLowerCase();
  const cat = course.category;
  const catAr = (cat?.nameAr ?? cat?.name_ar ?? "").toLowerCase();
  const catName = (cat?.name ?? "").toLowerCase();
  const catSlug = (cat?.slug ?? "").toLowerCase();
  return (
    titleAr.includes(q) ||
    title.includes(q) ||
    short.includes(q) ||
    shortEn.includes(q) ||
    slug.includes(q) ||
    catAr.includes(q) ||
    catName.includes(q) ||
    catSlug.includes(q)
  );
}

function toCourseCardProps(c: TeacherCourseListItem) {
  const cat = c.category;
  return {
    id: c.id,
    title: c.title,
    titleAr: c.titleAr ?? c.title_ar ?? null,
    slug: c.slug ?? null,
    shortDesc: c.shortDesc ?? c.short_desc ?? null,
    shortDescEn: c.shortDescEn ?? c.short_desc_en ?? null,
    imageUrl: c.imageUrl ?? c.image_url ?? null,
    price: c.price as number | string | { toNumber?: () => number } | undefined,
    courseRating: (c.courseRating ?? c.course_rating ?? null) as
      | number
      | string
      | { toNumber?: () => number }
      | null,
    courseRatingCount: (c.courseRatingCount ?? c.course_rating_count ?? null) as
      | number
      | string
      | { toNumber?: () => number }
      | null,
    duration: c.duration ?? null,
    level: c.level ?? null,
    category: cat
      ? {
          name: cat.name ?? "",
          nameAr: cat.nameAr ?? cat.name_ar ?? null,
        }
      : null,
  };
}

export function TeacherCoursesSearch({
  courses,
  /** عند false: شبكة واحدة (مثل «جميع الدورات») مع نفس شريط البحث */
  groupByCategory = true,
}: {
  courses: TeacherCourseListItem[];
  groupByCategory?: boolean;
}) {
  const [query, setQuery] = useState("");
  const locale = useLocale();
  const t = useT();

  const filtered = useMemo(
    () => courses.filter((c) => courseMatchesSearchQuery(c, query)),
    [courses, query],
  );

  const groups = useMemo(() => groupCoursesByCategory(filtered), [filtered]);

  const inputId = groupByCategory ? "teacher-courses-search" : "all-courses-search";

  return (
    <>
      <div className="mb-8">
        <label htmlFor={inputId} className="sr-only">
          {groupByCategory
            ? t("courses.teacherCoursesSearchLabel", "Search teacher courses")
            : t("courses.allCoursesSearchLabel", "Search courses")}
        </label>
        <input
          id={inputId}
          type="search"
          dir={locale === "ar" ? "rtl" : "ltr"}
          autoComplete="off"
          placeholder={
            locale === "ar"
              ? t("courses.searchPlaceholder", "ابحث باسم الدورة أو القسم…")
              : t("courses.searchPlaceholder", "Search by course or category…")
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[var(--color-foreground)] shadow-[var(--shadow-card)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/25"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-12 text-center">
          <p className="text-[var(--color-muted)]">
            {normalizeSearch(query)
              ? "لا توجد نتائج تطابق بحثك. جرّب اسم دورة أو قسم آخر."
              : "لا توجد دورات لعرضها."}
          </p>
        </div>
      ) : groupByCategory ? (
        <div className="space-y-12">
          {groups.map((group) => (
            <section key={group.slugKey}>
              <h2 className="mb-4 text-xl font-semibold text-[var(--color-foreground)]">
                {group.label}
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {group.courses.map((course) => (
                  <CourseCard key={course.id} course={toCourseCardProps(course)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={toCourseCardProps(course)} />
          ))}
        </div>
      )}
    </>
  );
}

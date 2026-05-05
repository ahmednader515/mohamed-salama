"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { useLocale, useT } from "@/components/LocaleProvider";
import { getDir } from "@/lib/i18n/core";
import type { Course } from "@/lib/types";
import type { Category } from "@/lib/types";

type CourseWithCategory = Course & { category?: Category };

type CourseCardCourse = {
  id: string;
  title: string;
  titleAr?: string | null;
  slug?: string | null;
  shortDesc?: string | null;
  duration?: string | null;
  level?: string | null;
  imageUrl?: string | null;
  price?: number | string;
  courseRating?: number | string | null;
  courseRatingCount?: number | string | null;
  category?: { name: string; nameAr?: string | null } | null;
};

function toCourseCardCourse(c: CourseWithCategory): CourseCardCourse {
  const raw = c as unknown as Record<string, unknown>;
  const cat = c.category as { name?: string; nameAr?: string | null } | undefined;
  const titleAr = raw.titleAr != null ? String(raw.titleAr) : (c.title_ar ?? null);
  const shortDesc = raw.shortDesc != null ? String(raw.shortDesc) : (c.short_desc ?? null);
  const imageUrl = raw.imageUrl != null ? String(raw.imageUrl) : (c.image_url ?? null);
  const nameAr = cat && (cat as Record<string, unknown>).nameAr != null ? String((cat as Record<string, unknown>).nameAr) : (cat?.name ?? null);
  return {
    id: c.id,
    title: c.title,
    titleAr: titleAr ?? undefined,
    slug: c.slug,
    shortDesc: shortDesc ?? undefined,
    duration: c.duration ?? undefined,
    level: c.level ?? undefined,
    imageUrl: imageUrl ?? undefined,
    price: c.price,
    courseRating:
      raw.courseRating != null
        ? Number(raw.courseRating)
        : raw.course_rating != null
          ? Number(raw.course_rating)
          : null,
    courseRatingCount:
      raw.courseRatingCount != null
        ? Number(raw.courseRatingCount)
        : raw.course_rating_count != null
          ? Number(raw.course_rating_count)
          : null,
    category: cat ? { name: cat.name ?? "", nameAr: nameAr ?? undefined } : undefined,
  };
}

export function MyCoursesSection({ courses }: { courses: CourseWithCategory[] }) {
  const t = useT();
  const locale = useLocale();
  const dir = getDir(locale);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const r = c as unknown as Record<string, unknown>;
      const title = String(r.titleAr ?? c.title_ar ?? c.title ?? "").toLowerCase();
      const titleEn = String(c.title ?? "").toLowerCase();
      const slug = String(c.slug ?? "").toLowerCase();
      return title.includes(q) || titleEn.includes(q) || slug.includes(q);
    });
  }, [courses, search]);

  if (courses.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          {t("dashboard.page.myCourses.title", "My courses")}
        </h2>
        <p className="text-[var(--color-muted)]">
          {t("dashboard.page.myCourses.emptyBeforeLink", "You have not enrolled in any course yet. ")}{" "}
          <Link href="/courses" className="font-medium text-[var(--color-primary)] hover:underline">
            {t("dashboard.page.myCourses.browseCoursesLink", "Browse courses")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
        {t("dashboard.page.myCourses.title", "My courses")}
      </h2>

      <div className="mb-6">
        <label htmlFor="my-courses-search" className="sr-only">
          {t("dashboard.page.myCourses.searchLabel", "Search my courses")}
        </label>
        <input
          id="my-courses-search"
          dir={dir}
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t(
            "dashboard.page.myCourses.searchPlaceholder",
            "Search by course name or URL slug...",
          )}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--color-muted)]">
          {t("dashboard.page.myCourses.noSearchResults", "No results match your search.")}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={toCourseCardCourse(course)} />
          ))}
        </div>
      )}
    </div>
  );
}

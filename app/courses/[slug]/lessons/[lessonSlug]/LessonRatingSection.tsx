"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { fillMessage } from "@/lib/i18n/interpolate";

type RatingSummary = {
  lessonId: string;
  courseId: string;
  averageRating: number | null;
  ratingCount: number;
  courseAverageRating: number | null;
  courseRatingCount: number;
  userRating: number | null;
};

export function LessonRatingSection({ lessonId }: { lessonId: string }) {
  const t = useT();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/lessons/${encodeURIComponent(lessonId)}/rating`, { credentials: "include" })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { error?: string; summary?: RatingSummary };
        if (!res.ok) throw new Error(data.error || t("courses.lessonRatingLoadFailed", "Failed to load ratings"));
        return data.summary ?? null;
      })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t("courses.lessonRatingLoadFailed", "Failed to load ratings"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, t]);

  async function handleRate(nextRating: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating: nextRating }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; summary?: RatingSummary };
      if (!res.ok) {
        setError(data.error || t("courses.lessonRatingSaveFailed", "Failed to save your rating"));
        return;
      }
      if (data.summary) setSummary(data.summary);
    } catch {
      setError(t("courses.lessonRatingSaveFailed", "Failed to save your rating"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        {t("courses.rateLessonTitle", "Rate this lesson")}
      </h3>
      <p className="mt-1 text-xs text-[var(--color-muted)]">
        {t("courses.rateLessonSubtitle", "Your rating helps improve course quality for everyone.")}
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = (summary?.userRating ?? 0) >= value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleRate(value)}
              disabled={busy || loading}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-2xl leading-none transition ${
                selected
                  ? "border-amber-500 bg-amber-500/15 text-amber-500"
                  : "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)]"
              } disabled:opacity-60`}
              aria-label={fillMessage(t("courses.rateStarsAria", "Rate {n} stars"), { n: value })}
            >
              ★
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="mt-3 rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-3 space-y-1 text-xs text-[var(--color-muted)]">
        {loading ? (
          <p>{t("courses.lessonRatingLoading", "Loading ratings...")}</p>
        ) : (
          <>
            <p>
              {summary?.averageRating != null && summary.ratingCount > 0
                ? fillMessage(
                    t(
                      "courses.lessonRatingAverageLine",
                      "Lesson rating: {rating}/5 ({count} ratings)",
                    ),
                    { rating: summary.averageRating.toFixed(1), count: summary.ratingCount },
                  )
                : t("courses.noRatings", "No ratings yet")}
            </p>
            <p>
              {summary?.courseAverageRating != null && summary.courseRatingCount > 0
                ? fillMessage(
                    t(
                      "courses.courseRatingAverageLine",
                      "Course rating (all lessons): {rating}/5 ({count} ratings)",
                    ),
                    {
                      rating: summary.courseAverageRating.toFixed(1),
                      count: summary.courseRatingCount,
                    },
                  )
                : t("courses.noCourseRatings", "No course ratings yet")}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

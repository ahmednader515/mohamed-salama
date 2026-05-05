"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QuizTake } from "./QuizTake";
import { useT } from "@/components/LocaleProvider";

export type QuizApiPayload = {
  id: string;
  title: string;
  courseId: string;
  order: number;
  timeLimitMinutes: number | null;
  course: { id: string; slug: string | null; title: string; titleAr: string | null };
  questions: Array<{
    id: string;
    type: string;
    questionText: string;
    order: number;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
  }>;
  /** من API: هل يمكن بدء محاولة جديدة؟ */
  canAttempt?: boolean;
  /** من API: عدد المحاولات المستخدمة داخل هذا الكورس */
  attemptsUsed?: number;
  /** من API: الحد الأقصى للمحاولات داخل الكورس */
  maxQuizAttempts?: number | null;
};

export function QuizPageClient({ quizId }: { quizId: string }) {
  const t = useT();
  const [quiz, setQuiz] = useState<QuizApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invalidQuizId = !quizId;

  useEffect(() => {
    if (invalidQuizId) return;
    fetch(`/api/quizzes/${encodeURIComponent(quizId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403 && data.id) {
            setQuiz(data);
            setError(null);
            return;
          }
          if (res.status === 404) throw new Error(t("quiz.quizNotFound", "Quiz not found"));
          throw new Error(data.error ?? t("quiz.loadFailed", "Failed to load quiz"));
        }
        setQuiz(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("quiz.loadFailed", "Failed to load quiz"));
        setQuiz(null);
      })
      .finally(() => setLoading(false));
  }, [invalidQuizId, quizId, t]);

  if (invalidQuizId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="rounded-[var(--radius-btn)] border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-600">
          {t("quiz.invalidQuizId", "Invalid quiz ID")}
        </p>
        <Link href="/courses" className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("common.backToCourses", "Back to courses")}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-[var(--color-muted)]">{t("quiz.loadingQuiz", "Loading quiz...")}</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="rounded-[var(--radius-btn)] border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-600">
          {error ?? t("quiz.quizNotFound", "Quiz not found")}
        </p>
        <Link href="/courses" className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("common.backToCourses", "Back to courses")}
        </Link>
      </div>
    );
  }

  const courseTitle = quiz.course.titleAr ?? quiz.course.title;
  const courseHref = quiz.course.slug
    ? `/courses/${encodeURIComponent(quiz.course.slug.trim())}`
    : `/courses/${quiz.course.id}`;

  const q = quiz as QuizApiPayload & { canAttempt?: boolean; attemptsUsed?: number; maxQuizAttempts?: number | null };
  if (q.canAttempt === false) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link href={courseHref} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          ← {t("courses.backToCourse", "Back to")} {courseTitle}
        </Link>
        <div className="mt-4 rounded-[var(--radius-card)] border border-amber-500/50 bg-amber-500/10 p-6">
          <h1 className="text-xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
          <p className="mt-2 text-[var(--color-foreground)]">
            {t("quiz.attemptsLimitReached", "You have reached the allowed attempts for this quiz in this course.")}
            {q.maxQuizAttempts != null && <span className="mr-1">({t("quiz.limitLabel", "Limit:")} {q.maxQuizAttempts} {t("quiz.attemptsLabel", "attempts")})</span>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href={courseHref} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
        ← {t("courses.backToCourse", "Back to")} {courseTitle}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-[var(--color-foreground)]">{quiz.title}</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {quiz.questions.length} {t("courses.questions", "questions")}
        {(q.maxQuizAttempts != null && q.attemptsUsed != null) && (
          <span className="mr-2"> — {t("quiz.usedAttempts", "Used")} {q.attemptsUsed} {t("quiz.fromAttempts", "of")} {q.maxQuizAttempts} {t("quiz.attemptsLabel", "attempts")}</span>
        )}
        {quiz.timeLimitMinutes != null && quiz.timeLimitMinutes > 0 && (
          <span className="mr-2"> — {t("quiz.durationLabel", "Quiz duration:")} {quiz.timeLimitMinutes} {t("quiz.minutes", "minutes")}</span>
        )}
      </p>
      <QuizTake quiz={quiz} />
    </div>
  );
}

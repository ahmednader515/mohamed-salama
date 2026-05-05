"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { QuizApiPayload } from "./QuizPageClient";
import { useT } from "@/components/LocaleProvider";

export function QuizTake({ quiz }: { quiz: QuizApiPayload }) {
  const t = useT();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timeLimitMinutes = quiz.timeLimitMinutes ?? null;
  const totalSeconds =
    timeLimitMinutes != null && Number(timeLimitMinutes) > 0
      ? Math.floor(Number(timeLimitMinutes)) * 60
      : 0;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeUpSubmitStartedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const canAttempt = quiz.canAttempt !== false;
  const attemptsUsed = typeof quiz.attemptsUsed === "number" ? quiz.attemptsUsed : null;
  const maxQuizAttempts = typeof quiz.maxQuizAttempts === "number" ? quiz.maxQuizAttempts : null;

  function setAnswer(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  }

  const allAnswered = quiz.questions.every((q) => {
    const a = answers[q.id];
    if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") return a !== undefined && a !== "";
    return true;
  });

  const totalScored = quiz.questions.filter(
    (q) => q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE"
  ).length;

  function calculateScore() {
    let s = 0;
    quiz.questions.forEach((q) => {
      if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        const opt = q.options.find((o) => o.id === answers[q.id]);
        if (opt?.isCorrect) s++;
      }
    });
    return s;
  }

  function calculateScoreFromAnswers(ans: Record<string, string>) {
    let s = 0;
    quiz.questions.forEach((q) => {
      if (q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE") {
        const opt = q.options.find((o) => o.id === ans[q.id]);
        if (opt?.isCorrect) s++;
      }
    });
    return s;
  }

  const submitAnswers = useCallback(
    async (reason?: "timeup") => {
      const s = reason === "timeup" ? calculateScoreFromAnswers(answersRef.current) : calculateScore();
      setSubmitting(true);
      try {
        const res = await fetch(`/api/quizzes/${encodeURIComponent(quiz.id)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: s, totalQuestions: totalScored, attemptId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          alert(data.error ?? t("quiz.saveResultFailed", "Failed to save result"));
          if (reason === "timeup") timeUpSubmitStartedRef.current = false;
          setSubmitting(false);
          return;
        }
        setSubmitted(true);
        if (reason === "timeup") {
          setToastMessage(t("quiz.examTimeEnded", "Time is up"));
        }
      } catch {
        alert(t("quiz.serverConnectionFailed", "Failed to connect to server"));
        if (reason === "timeup") timeUpSubmitStartedRef.current = false;
      } finally {
        setSubmitting(false);
      }
    },
    [attemptId, quiz.id, t, totalScored]
  );

  async function handleStart() {
    if (!canAttempt || starting || started) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/quizzes/${encodeURIComponent(quiz.id)}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? t("quiz.cannotStartQuiz", "Unable to start quiz"));
        return;
      }
      const id = typeof data.attemptId === "string" ? data.attemptId : null;
      setAttemptId(id);
      setStarted(true);
    } catch {
      alert(t("quiz.serverConnectionFailed", "Failed to connect to server"));
    } finally {
      setStarting(false);
    }
  }

  async function handleSubmit() {
    if (!allAnswered && remainingSeconds > 0) return;
    await submitAnswers();
  }

  // مؤقت: عد تنازلي — إيقاف المؤقت عند الوصول لصفر ثم تسليم تلقائي (إجابات حالية فقط)
  useEffect(() => {
    timeUpSubmitStartedRef.current = false;
    if (!started || submitted || totalSeconds <= 0) return;
    setRemainingSeconds(totalSeconds);
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (intervalRef.current === id) intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    intervalRef.current = id;
    return () => {
      clearInterval(id);
      if (intervalRef.current === id) intervalRef.current = null;
    };
  }, [started, submitted, totalSeconds]);

  useEffect(() => {
    if (!started || submitted || totalSeconds <= 0 || remainingSeconds > 0) return;
    if (timeUpSubmitStartedRef.current) return;
    timeUpSubmitStartedRef.current = true;
    void submitAnswers("timeup");
  }, [remainingSeconds, started, submitted, submitAnswers, totalSeconds]);

  // إخفاء الإشعار بعد 4 ثوانٍ
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  let score = 0;
  if (submitted) {
    score = calculateScore();
  }

  const mm = Math.floor(remainingSeconds / 60);
  const ss = remainingSeconds % 60;
  const timeDisplay = `${mm}:${ss.toString().padStart(2, "0")}`;

  return (
    <div className="mt-8 space-y-8">
      {toastMessage && (
        <div
          className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-[var(--radius-btn)] border border-amber-500/50 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 shadow-lg"
          role="alert"
        >
          {toastMessage}
        </div>
      )}

      {!submitted && started && totalSeconds > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <p className="text-sm font-medium text-[var(--color-foreground)]">
            {t("quiz.remainingTime", "Time left:")} <span className="font-mono text-[var(--color-primary)]">{timeDisplay}</span>
          </p>
        </div>
      )}

      {!started && !submitted ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t("quiz.readyTitle", "Ready to start the quiz?")}</h3>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("quiz.readySubtitle", "When you click \"Start quiz\", one attempt will be counted.")}
            {maxQuizAttempts != null && attemptsUsed != null ? (
              <span className="mr-1"> ({t("quiz.usedAttempts", "Used")}: {attemptsUsed} {t("quiz.fromAttempts", "of")} {maxQuizAttempts})</span>
            ) : null}
          </p>
          {!canAttempt ? (
            <p className="mt-4 rounded-[var(--radius-btn)] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {t("quiz.cannotAttempt", "You cannot start a new attempt for this quiz due to attempt limits.")}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={!canAttempt || starting}
              className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {starting ? t("quiz.starting", "Starting...") : t("quiz.start", "Start quiz")}
            </button>
          </div>
        </div>
      ) : null}

      {started
        ? quiz.questions.map((q, i) => (
        <div
          key={q.id}
          className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <p className="font-medium text-[var(--color-foreground)]">
            {i + 1}. {q.questionText}
          </p>
          <span className="mt-1 block text-xs text-[var(--color-muted)]">
            {q.type === "MULTIPLE_CHOICE"
              ? t("quiz.multipleChoice", "Multiple choice")
              : q.type === "TRUE_FALSE"
                ? t("quiz.trueFalse", "True/False")
                : t("quiz.essay", "Essay")}
          </span>
          {q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE" ? (
            <ul className="mt-4 space-y-2">
              {q.options.map((opt) => (
                <li key={opt.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded border border-[var(--color-border)] p-3 hover:bg-[var(--color-background)]">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      disabled={submitted}
                    />
                    <span>{opt.text}</span>
                    {submitted && opt.isCorrect && (
                      <span className="text-sm text-[var(--color-success)]">✓ {t("quiz.correctAnswer", "Correct answer")}</span>
                    )}
                    {submitted && answers[q.id] === opt.id && !opt.isCorrect && (
                      <span className="text-sm text-red-600">✗</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <textarea
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              placeholder={t("quiz.essayPlaceholder", "Write your answer here...")}
              rows={4}
              disabled={submitted}
              className="mt-4 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            />
          )}
        </div>
      ))
        : null}

      {!submitted && started ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!allAnswered && remainingSeconds > 0) || submitting}
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {submitting ? t("quiz.submitting", "Submitting...") : t("quiz.finishAndShowResult", "Finish and show result")}
        </button>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]/30 p-6">
          <p className="text-lg font-semibold text-[var(--color-foreground)]">
            {t("quiz.resultPrefix", "Your score in MCQ/True-False questions:")} {score} {t("quiz.from", "out of")} {totalScored}
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {t("quiz.essayNotAutoCorrected", "Essay questions are not auto-graded; the teacher can review them later.")}
          </p>
        </div>
      )}
    </div>
  );
}

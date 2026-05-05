"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";
import { fillMessage } from "@/lib/i18n/interpolate";
import type { Locale } from "@/lib/i18n/types";

type Attempt = {
  userId: string;
  quizId: string;
  userName: string | null;
  userEmail: string | null;
  courseTitle: string | null;
  quizTitle: string | null;
  score: number;
  totalQuestions: number;
  createdAt: string;
};

type CourseInfo = { title: string; titleAr: string | null };

type EnrollmentInfo = { course: CourseInfo };

type StudentWithDetails = {
  student: { id: string; name: string | null; email: string | null };
  enrollments: EnrollmentInfo[];
  userAttempts: Attempt[];
};

type Props = {
  studentsCount: number;
  totalEnrollments: number;
  attemptsCount: number;
  totalEarnings: number;
  attempts: Attempt[];
  studentsWithDetails: StudentWithDetails[];
  titleSuffix?: string;
};

function formatDate(d: Date | string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocaleForUi(locale), {
    dateStyle: "short",
    timeStyle: "short",
  }).format(typeof d === "string" ? new Date(d) : d);
}

export default function StatisticsContent({
  studentsCount,
  totalEnrollments,
  attemptsCount,
  totalEarnings,
  attempts,
  studentsWithDetails,
  titleSuffix = "",
}: Props) {
  const t = useT();
  const locale = useLocale();
  const { dir, thClassCompact } = useDashboardTable();
  const [searchQuery, setSearchQuery] = useState("");
  const egp = t("common.egyptianPoundShort", "EGP");

  const trimmed = searchQuery.trim().toLowerCase();

  const filteredAttempts = useMemo(() => {
    if (!trimmed) return attempts;
    return attempts.filter((a) => {
      const name = (a.userName ?? "").toLowerCase();
      const email = (a.userEmail ?? "").toLowerCase();
      return name.includes(trimmed) || email.includes(trimmed);
    });
  }, [attempts, trimmed]);

  const filteredStudentsWithDetails = useMemo(() => {
    if (!trimmed) return studentsWithDetails;
    return studentsWithDetails.filter((swd) => {
      const name = (swd.student.name ?? "").toLowerCase();
      const email = (swd.student.email ?? "").toLowerCase();
      return name.includes(trimmed) || email.includes(trimmed);
    });
  }, [studentsWithDetails, trimmed]);

  const pq = `dashboard.statisticsPage`;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          {t(`${pq}.title`, "Student statistics")}
          {titleSuffix ? ` ${titleSuffix}` : ""}
        </h2>
        <Link href="/dashboard" className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          {t("dashboard.backToDashboard", "← Back to dashboard")}
        </Link>
      </div>

      <div className="mb-6">
        <label htmlFor="student-search" className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
          {t(`${pq}.studentSearchLabel`, "Find a student")}
        </label>
        <input
          id="student-search"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t(`${pq}.studentSearchPlaceholder`, "Student name or email…")}
          className="w-full max-w-md rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          dir={locale === "ar" ? "rtl" : "ltr"}
        />
        {trimmed && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            {fillMessage(t(`${pq}.filterSummary`, "Showing {students} students, {attempts} quiz attempts"), {
              students: String(filteredStudentsWithDetails.length),
              attempts: String(filteredAttempts.length),
            })}
          </p>
        )}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">{t(`${pq}.cardStudents`, "Students")}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{studentsCount}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">{t(`${pq}.cardEnrollments`, "Total course enrollments")}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{totalEnrollments}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="text-sm text-[var(--color-muted)]">{t(`${pq}.cardAttempts`, "Quiz attempts")}</p>
          <p className="text-2xl font-bold text-[var(--color-foreground)]">{attemptsCount}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-light)]/20 p-4">
          <p className="text-sm text-[var(--color-muted)]">{t(`${pq}.cardEarningsTitle`, "Total platform earnings")}</p>
          <p className="text-2xl font-bold text-[var(--color-primary)]">
            {totalEarnings.toFixed(2)} {egp}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            {t(`${pq}.cardEarningsHint`, "From student balance paid to enroll in courses")}
          </p>
        </div>
      </div>

      <section className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          {t(`${pq}.sectionQuizScores`, "Quiz scores")}
        </h3>
        {filteredAttempts.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            {trimmed
              ? t(`${pq}.noAttemptsFiltered`, "No results match your search.")
              : t(`${pq}.noAttemptsEmpty`, "No attempts recorded yet.")}
          </p>
        ) : (
          <div dir={dir} className="overflow-x-auto">
            <table dir={dir} className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className={thClassCompact}>{t(`${pq}.colStudent`, "Student")}</th>
                  <th className={thClassCompact}>{t(`${pq}.colEmail`, "Email")}</th>
                  <th className={thClassCompact}>{t(`${pq}.colCourse`, "Course")}</th>
                  <th className={thClassCompact}>{t(`${pq}.colQuiz`, "Quiz")}</th>
                  <th className={thClassCompact}>{t(`${pq}.colScore`, "Score")}</th>
                  <th className={thClassCompact}>{t(`${pq}.colDate`, "Date")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttempts.map((a) => (
                  <tr key={`${a.userId}-${a.quizId}-${a.createdAt}`} className="border-b border-[var(--color-border)]/50">
                    <td className="px-3 py-2 text-[var(--color-foreground)]">{a.userName}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{a.userEmail}</td>
                    <td className="px-3 py-2 text-[var(--color-foreground)]">{a.courseTitle}</td>
                    <td className="px-3 py-2 text-[var(--color-foreground)]">{a.quizTitle}</td>
                    <td className="px-3 py-2 text-[var(--color-foreground)]">
                      {a.score} / {a.totalQuestions}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{formatDate(a.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
          {t(`${pq}.sectionStudentsEnrollments`, "Students & enrollments")}
        </h3>
        {filteredStudentsWithDetails.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            {trimmed
              ? t(`${pq}.noStudentsFiltered`, "No results match your search.")
              : t(`${pq}.noStudentsEmpty`, "No students registered.")}
          </p>
        ) : (
          <ul className="space-y-4">
            {filteredStudentsWithDetails.map(({ student: s, enrollments, userAttempts }) => (
              <li
                key={s.id}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">{s.name}</p>
                    <p className="text-sm text-[var(--color-muted)]">{s.email}</p>
                  </div>
                  <div className="flex gap-3 text-sm text-[var(--color-muted)]">
                    <span>
                      {fillMessage(t(`${pq}.enrolledInCourses`, "Enrolled in {count} course(s)"), {
                        count: String(enrollments.length),
                      })}
                    </span>
                    <span>
                      {t(`${pq}.quizAttemptsCount`, "Quiz attempts:")} {userAttempts.length}
                    </span>
                  </div>
                </div>
                {enrollments.length > 0 && (
                  <p className="mt-2 text-sm text-[var(--color-foreground)]">
                    {t(`${pq}.coursesLabel`, "Courses:")}{" "}
                    {enrollments.map((e) => e.course.titleAr ?? e.course.title).join(locale === "ar" ? "، " : ", ")}
                  </p>
                )}
                {userAttempts.length > 0 && (
                  <div className="mt-2 text-xs text-[var(--color-muted)]">
                    {t(`${pq}.latestResults`, "Latest results:")}{" "}
                    {userAttempts
                      .slice(0, 3)
                      .map((a) => `${a.quizTitle} (${a.score}/${a.totalQuestions})`)
                      .join(" — ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

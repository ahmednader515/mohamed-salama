"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

const baseClass =
  "rounded-[var(--radius-btn)] border px-4 py-2 text-sm font-medium transition";
const inactiveClass =
  "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-border)]/50";
const activeClass =
  "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]";

function NavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
    >
      {children}
    </Link>
  );
}

export function DashboardNav({
  isAdmin,
  isAssistant,
  isTeacher,
}: {
  isAdmin: boolean;
  isAssistant: boolean;
  isTeacher: boolean;
}) {
  const t = useT();
  const isStaff = isAdmin || isAssistant;

  if (isTeacher) {
    return (
      <>
        <NavLink href="/dashboard/courses">{t("dashboardNav.manageMyCourses", "Manage my courses")}</NavLink>
        <NavLink href="/dashboard/courses/new" exact>
          {t("dashboardNav.createCourse", "Create course")}
        </NavLink>
        <NavLink href="/dashboard/statistics">{t("dashboardNav.studentStats", "Student statistics")}</NavLink>
        <NavLink href="/dashboard/codes">{t("dashboardNav.createCodes", "Create codes")}</NavLink>
        <NavLink href="/dashboard/homework">{t("dashboardNav.homework", "Student homework")}</NavLink>
        <NavLink href="/dashboard/messages">{t("dashboardNav.contactMyStudents", "Contact my students")}</NavLink>
        <NavLink href="/dashboard/live-streams">{t("dashboardNav.liveStreams", "Live streams")}</NavLink>
      </>
    );
  }

  if (!isStaff) {
    return (
      <>
        <NavLink href="/dashboard/messages">
          {t("dashboardNav.inbox", "Inbox")}
        </NavLink>
        <Link
          href="/courses"
          className={`${baseClass} ${inactiveClass}`}
        >
          {t("dashboardNav.availableCourses", "Available courses")}
        </Link>
      </>
    );
  }

  return (
    <>
      <NavLink href="/dashboard/students">
        {isAdmin ? t("dashboardNav.studentsAccounts", "Students & accounts") : t("dashboardNav.students", "Students")}
      </NavLink>
      <NavLink href="/dashboard/statistics">
        {t("dashboardNav.studentStats", "Student statistics")}
      </NavLink>
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/password-change-requests">
          {t("dashboardNav.passwordChangeRequests", "Account change requests")}
        </NavLink>
      )}
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/codes">
          {t("dashboardNav.createCodes", "Create codes")}
        </NavLink>
      )}
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/homework">
          {t("dashboardNav.homework", "Student homework")}
        </NavLink>
      )}
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/messages">
          {t("dashboardNav.privateStudentMessages", "Private student messages")}
        </NavLink>
      )}
      {isAdmin && (
        <>
          <NavLink href="/dashboard/courses">
            {t("dashboardNav.manageCourses", "Manage courses")}
          </NavLink>
          <NavLink href="/dashboard/courses/new" exact>
            {t("dashboardNav.createCourse", "Create course")}
          </NavLink>
          <NavLink href="/dashboard/reviews">
            {t("dashboardNav.studentReviews", "Student reviews")}
          </NavLink>
          <NavLink href="/dashboard/settings/copyright-overlay">
            {t("dashboardNav.copyrightSettings", "Copyright code settings")}
          </NavLink>
          <NavLink href="/dashboard/live-streams">
            {t("dashboardNav.liveStreams", "Live streams")}
          </NavLink>
          <NavLink href="/dashboard/teachers">{t("dashboardNav.multipleTeachers", "Multiple teachers")}</NavLink>
          <NavLink href="/dashboard/subscriptions">{t("dashboardNav.platformSubscriptions", "Platform subscriptions")}</NavLink>
          <NavLink href="/dashboard/subscription-students">{t("dashboardNav.subscribedStudents", "Subscribed students")}</NavLink>
          <NavLink href="/dashboard/store">{t("dashboardNav.platformStore", "Platform store")}</NavLink>
        </>
      )}
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/settings/homepage">
          {t("dashboardNav.homepageSettings", "Homepage settings")}
        </NavLink>
      )}
      {(isAdmin || isAssistant) && (
        <NavLink href="/dashboard/settings/add-balance">
          {t("dashboardNav.paymentMethods", "Student payment methods")}
        </NavLink>
      )}
    </>
  );
}

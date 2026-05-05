import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { HomeworkSubmissionsList } from "./HomeworkSubmissionsList";

export default async function DashboardHomeworkPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const isStaff = session.user.role === "ADMIN" || session.user.role === "ASSISTANT_ADMIN";
  const isTeacher = session.user.role === "TEACHER";
  if (!isStaff && !isTeacher) redirect("/dashboard");
  const t = await getServerTranslator();

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t(
          isTeacher
            ? "dashboard.homeworkPage.titleTeacher"
            : "dashboard.homeworkPage.titleStaff",
        )}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isTeacher
          ? t("dashboard.homeworkPage.subtitleTeacher")
          : t("dashboard.homeworkPage.subtitleStaff")}
      </p>
      <HomeworkSubmissionsList allowDeleteAll={isStaff} />
    </div>
  );
}

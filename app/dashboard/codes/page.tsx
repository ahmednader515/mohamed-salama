import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCoursesAll, getCoursesWithCountsForCreator } from "@/lib/db";
import { getServerTranslator } from "@/lib/i18n/server";
import { CodesManage } from "./CodesManage";

export default async function DashboardCodesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const isStaff = session.user.role === "ADMIN" || session.user.role === "ASSISTANT_ADMIN";
  const isTeacher = session.user.role === "TEACHER";
  if (!isStaff && !isTeacher) redirect("/dashboard");
  const t = await getServerTranslator();

  const courses = isTeacher
    ? await getCoursesWithCountsForCreator(session.user.id).catch(() => [])
    : await getCoursesAll();
  const courseOptions = courses.map((c) => ({
    id: String((c as { id?: unknown }).id ?? ""),
    title: (c as { title_ar?: string; title: string }).title_ar ?? (c as { title: string }).title,
  })).filter((o) => o.id);

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.codesRoutePage.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {isTeacher
          ? t("dashboard.codesRoutePage.descTeacher")
          : t("dashboard.codesRoutePage.descStaff")}
      </p>
      <CodesManage courseOptions={courseOptions} />
    </div>
  );
}

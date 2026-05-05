import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardNav } from "./DashboardNav";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const t = await getServerTranslator();
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const isAssistant = session.user.role === "ASSISTANT_ADMIN";
  const isTeacher = session.user.role === "TEACHER";

  return (
    <>
      {isAdmin ? (
        <div className="admin-intro-loader" aria-hidden>
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-stripe" />
          <div className="admin-intro-claim">
            <span>{t("dashboard.introHello", "Welcome")}</span>
            <span>{t("dashboard.introBack", "back")}</span>
            <span>{t("dashboard.introAgain", "again")}</span>
          </div>
        </div>
      ) : null}
      <div
        className={`mx-auto max-w-6xl px-4 py-8 sm:px-6 ${
          isAdmin || isAssistant ? "dashboard-admin-glow relative isolate overflow-hidden rounded-2xl" : ""
        }`}
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            {t("dashboard.title", "Dashboard")}
          </h1>
          <nav className="flex flex-wrap items-center gap-2">
            <DashboardNav isAdmin={isAdmin} isAssistant={isAssistant} isTeacher={isTeacher} />
          </nav>
        </div>
        {children}
      </div>
    </>
  );
}

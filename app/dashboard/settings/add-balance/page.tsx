import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings } from "@/lib/db";
import { AddBalanceSettingsForm } from "./AddBalanceSettingsForm";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function DashboardAddBalanceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN") redirect("/dashboard");
  const t = await getServerTranslator();

  const settings = await getHomepageSettings();

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.addBalanceSettingsTitle", "Add balance page settings")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {t(
          "dashboard.addBalanceSettingsDescription",
          "Edit wallet numbers and all student-facing text for the add-balance page in both Arabic and English.",
        )}
      </p>
      <AddBalanceSettingsForm initialSettings={settings} />
    </div>
  );
}

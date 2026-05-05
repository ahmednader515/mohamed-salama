import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getHomepageSettings } from "@/lib/db";
import { getServerTranslator } from "@/lib/i18n/server";
import { CopyrightOverlaySettingsForm } from "./CopyrightOverlaySettingsForm";

export default async function DashboardCopyrightOverlaySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const t = await getServerTranslator();

  const settings = await getHomepageSettings();

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.copyrightRoutePage.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {t("dashboard.copyrightRoutePage.subtitle")}
      </p>
      <CopyrightOverlaySettingsForm
        initialStyle={
          settings.copyrightOverlayStyle === "watermark" ? "watermark" : "floating"
        }
      />
    </div>
  );
}

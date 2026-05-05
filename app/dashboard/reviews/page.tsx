import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { ReviewsManage } from "./ReviewsManage";

export default async function DashboardReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");
  const t = await getServerTranslator();

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-foreground)]">
        {t("dashboard.reviewsPage.title")}
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        {t("dashboard.reviewsPage.subtitle")}
      </p>
      <ReviewsManage />
    </div>
  );
}

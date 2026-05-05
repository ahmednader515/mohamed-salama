import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  getStoreFeatureEnabled,
  getHomepageSettings,
  listStoreProductsAll,
  listStorePurchasesForAdmin,
  getStoreSalesStats,
} from "@/lib/db";
import { getServerTranslator } from "@/lib/i18n/server";
import { StoreAdminClient } from "./StoreAdminClient";

export default async function StoreDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const t = await getServerTranslator();

  const [enabled, homepage] = await Promise.all([
    getStoreFeatureEnabled(),
    getHomepageSettings().catch(() => null),
  ]);
  const [products, purchases, stats] = await Promise.all([
    listStoreProductsAll().catch(() => []),
    listStorePurchasesForAdmin().catch(() => []),
    getStoreSalesStats().catch(() => ({
      purchasesCount: 0,
      buyersCount: 0,
      soldProductsCount: 0,
      revenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMarginPercent: null,
      byProduct: [],
    })),
  ]);

  const initialHomeStoreTitle =
    homepage?.storeSectionTitle?.trim() || t("dashboard.storeAdminDefaults.sectionTitleFallback");
  const initialHomeStoreDescription =
    homepage?.storeSectionDescription?.trim() ||
    t("dashboard.storeAdminDefaults.sectionDescriptionFallback");

  return (
    <StoreAdminClient
      initialEnabled={enabled}
      initialHomeStoreTitle={initialHomeStoreTitle}
      initialHomeStoreDescription={initialHomeStoreDescription}
      initialProducts={products}
      initialPurchases={purchases}
      initialStats={stats}
    />
  );
}

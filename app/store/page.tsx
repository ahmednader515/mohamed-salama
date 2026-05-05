import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getHomepageSettings,
  getLatestPlatformSubscriptionExpiry,
  listStudentStorePurchases,
  listStoreProductsPublic,
  userHasActivePlatformSubscription,
} from "@/lib/db";
import { StoreBrowseClient } from "./StoreBrowseClient";
import { StorePageReadyBeacon } from "./StorePageReadyBeacon";

export default async function StorePage() {
  const settings = await getHomepageSettings().catch(() => null);
  const session = await getServerSession(authOptions);
  const products = await listStoreProductsPublic().catch(() => []);

  let isSubscribed = false;
  let purchasedProductIds: string[] = [];
  if (session?.user?.role === "STUDENT" && session.user.id) {
    const active = await userHasActivePlatformSubscription(session.user.id).catch(() => false);
    if (active) {
      const exp = await getLatestPlatformSubscriptionExpiry(session.user.id).catch(() => null);
      isSubscribed = !!exp;
    }
    const purchases = await listStudentStorePurchases(session.user.id).catch(() => []);
    purchasedProductIds = purchases.map((p) => p.productId);
  }

  if (!settings?.storeEnabled) {
    return (
      <>
        <StorePageReadyBeacon />
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-4xl rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">متجر المنصة غير متاح الآن</h1>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <StorePageReadyBeacon />
      <StoreBrowseClient
        products={products}
        isSubscribed={isSubscribed}
        isLoggedIn={!!session}
        purchasedProductIds={purchasedProductIds}
      />
    </>
  );
}

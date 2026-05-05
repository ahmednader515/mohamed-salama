import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getSubscriptionsFeatureEnabled, listSubscriptionPlansAll } from "@/lib/db";
import { SubscriptionsAdminClient, type AdminPlanRow } from "./SubscriptionsAdminClient";

export default async function SubscriptionsDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const enabled = await getSubscriptionsFeatureEnabled();
  let plans: AdminPlanRow[] = [];
  try {
    const rows = await listSubscriptionPlansAll();
    plans = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      imageUrl: r.imageUrl,
      durationKind: r.durationKind,
      price: r.price,
      isActive: r.isActive,
    }));
  } catch {
    plans = [];
  }

  return <SubscriptionsAdminClient initialEnabled={enabled} initialPlans={plans} />;
}

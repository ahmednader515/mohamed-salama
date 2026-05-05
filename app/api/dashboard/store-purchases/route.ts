import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStoreSalesStats, listStorePurchasesForAdmin } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const [purchases, stats] = await Promise.all([
      listStorePurchasesForAdmin(),
      getStoreSalesStats(),
    ]);
    return NextResponse.json({ purchases, stats });
  } catch {
    return NextResponse.json({ error: "فشل جلب بيانات المبيعات" }, { status: 500 });
  }
}

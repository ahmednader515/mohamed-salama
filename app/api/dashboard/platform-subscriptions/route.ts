import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUserPlatformSubscriptionsForAdmin } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const subscriptions = await listUserPlatformSubscriptionsForAdmin();
    return NextResponse.json({ subscriptions });
  } catch (e) {
    console.error("GET platform-subscriptions", e);
    return NextResponse.json({ error: "فشل جلب الاشتراكات" }, { status: 500 });
  }
}

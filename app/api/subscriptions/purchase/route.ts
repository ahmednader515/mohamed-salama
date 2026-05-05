import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSubscriptionsFeatureEnabled, purchasePlatformSubscription } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "يجب تسجيل الدخول كطالب" }, { status: 403 });
  }
  const enabled = await getSubscriptionsFeatureEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "ميزة الاشتراكات غير مفعّلة" }, { status: 400 });
  }
  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const planId = body.planId?.trim();
  if (!planId) return NextResponse.json({ error: "معرف الباقة مطلوب" }, { status: 400 });
  try {
    const { expiresAt } = await purchasePlatformSubscription(session.user.id, planId);
    return NextResponse.json({
      success: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل الشراء";
    const lower = msg.toLowerCase();
    if (msg.includes("مشترك في المنصة بالفعل")) {
      return NextResponse.json({ error: msg, alreadySubscribed: true }, { status: 400 });
    }
    if (lower.includes("رصيد") || lower.includes("غير كاف")) {
      return NextResponse.json({ error: msg, insufficientBalance: true }, { status: 400 });
    }
    if (lower.includes("غير متاح") || lower.includes("طلاب")) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("POST subscriptions/purchase", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

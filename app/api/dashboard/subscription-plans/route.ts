import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSubscriptionPlan, listSubscriptionPlansAll } from "@/lib/db";
import type { SubscriptionDurationKind } from "@/lib/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const plans = await listSubscriptionPlansAll();
    return NextResponse.json({ plans });
  } catch (e) {
    console.error("GET subscription-plans", e);
    return NextResponse.json({ error: "فشل جلب الباقات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: {
    name?: string;
    description?: string;
    imageUrl?: string | null;
    durationKind?: string;
    price?: number;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "اسم الاشتراك مطلوب" }, { status: 400 });
  const dk = body.durationKind as SubscriptionDurationKind | undefined;
  if (dk !== "week" && dk !== "month" && dk !== "year") {
    return NextResponse.json({ error: "اختر مدة: week أو month أو year" }, { status: 400 });
  }
  const price = typeof body.price === "number" && Number.isFinite(body.price) ? Math.max(0, body.price) : 0;
  try {
    const { id } = await createSubscriptionPlan({
      name,
      description: body.description?.trim() ?? "",
      image_url: body.imageUrl?.trim() || null,
      duration_kind: dk,
      price,
      is_active: body.isActive !== false,
    });
    return NextResponse.json({ success: true, id });
  } catch (e) {
    console.error("POST subscription-plans", e);
    return NextResponse.json({ error: "فشل إنشاء الباقة" }, { status: 500 });
  }
}

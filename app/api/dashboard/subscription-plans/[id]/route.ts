import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteSubscriptionPlan, updateSubscriptionPlan } from "@/lib/db";
import type { SubscriptionDurationKind } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

type PlanPatch = {
  name?: string;
  description?: string;
  image_url?: string | null;
  duration_kind?: SubscriptionDurationKind;
  price?: number;
  is_active?: boolean;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
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
  const patch: PlanPatch = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.description !== undefined) patch.description = body.description.trim();
  if (body.imageUrl !== undefined) patch.image_url = body.imageUrl?.trim() || null;
  if (body.durationKind !== undefined) {
    const dk = body.durationKind as SubscriptionDurationKind;
    if (dk !== "week" && dk !== "month" && dk !== "year") {
      return NextResponse.json({ error: "مدة غير صالحة" }, { status: 400 });
    }
    patch.duration_kind = dk;
  }
  if (body.price !== undefined) patch.price = Math.max(0, Number(body.price) || 0);
  if (body.isActive !== undefined) patch.is_active = !!body.isActive;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }
  try {
    await updateSubscriptionPlan(id, {
      name: patch.name,
      description: patch.description,
      image_url: patch.image_url,
      duration_kind: patch.duration_kind,
      price: patch.price,
      is_active: patch.is_active,
    });
  } catch (e) {
    console.error("PATCH subscription-plans/[id]", e);
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteSubscriptionPlan(id);
  } catch (e) {
    console.error("DELETE subscription-plans/[id]", e);
    return NextResponse.json({ error: "تعذر الحذف — قد تكون الباقة مرتبطة بسجلات" }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}

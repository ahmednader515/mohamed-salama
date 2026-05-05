import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteStoreProduct, updateStoreProduct } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  let body: {
    title?: string;
    description?: string;
    price?: number;
    costPrice?: number;
    imageUrl?: string | null;
    pdfUrl?: string | null;
    isActive?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  try {
    let cost_price: number | undefined;
    if (body.costPrice !== undefined) {
      const c = Number(body.costPrice);
      if (!Number.isFinite(c) || c < 0) {
        return NextResponse.json({ error: "تكلفة الوحدة غير صالحة" }, { status: 400 });
      }
      cost_price = c;
    }
    await updateStoreProduct(id, {
      title: body.title,
      description: body.description,
      price: body.price,
      cost_price,
      image_url: body.imageUrl,
      pdf_url: body.pdfUrl,
      is_active: body.isActive,
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل تحديث المنتج" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await deleteStoreProduct(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "فشل حذف المنتج" }, { status: 500 });
  }
}

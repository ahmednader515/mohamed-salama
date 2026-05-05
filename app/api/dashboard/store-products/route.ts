import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createStoreProduct, listStoreProductsAll } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const products = await listStoreProductsAll();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "فشل جلب منتجات المتجر" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
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
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "اسم المنتج مطلوب" }, { status: 400 });
  const price = Number(body.price ?? 0);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "سعر غير صالح" }, { status: 400 });
  }
  const costRaw = body.costPrice;
  const costPrice = costRaw === undefined || costRaw === null ? 0 : Number(costRaw);
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return NextResponse.json({ error: "تكلفة الوحدة غير صالحة" }, { status: 400 });
  }
  const pdfUrl = String(body.pdfUrl ?? "").trim();
  if (!pdfUrl) {
    return NextResponse.json({ error: "رابط ملف PDF إجباري" }, { status: 400 });
  }

  try {
    const out = await createStoreProduct({
      title,
      description: String(body.description ?? ""),
      price,
      cost_price: costPrice,
      image_url: body.imageUrl ?? null,
      pdf_url: pdfUrl,
      is_active: body.isActive !== false,
    });
    return NextResponse.json({ success: true, id: out.id });
  } catch {
    return NextResponse.json({ error: "فشل إنشاء المنتج" }, { status: 500 });
  }
}

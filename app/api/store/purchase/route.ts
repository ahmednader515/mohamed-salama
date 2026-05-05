import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buyStoreProduct } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "الشراء متاح للطلاب فقط" }, { status: 403 });
  }

  let body: { productId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const productId = String(body.productId ?? "").trim();
  if (!productId) return NextResponse.json({ error: "productId مطلوب" }, { status: 400 });

  try {
    const out = await buyStoreProduct(session.user.id, productId);
    return NextResponse.json({ success: true, ...out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل شراء المنتج";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

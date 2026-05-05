import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReviews, createReview } from "@/lib/db";

/** قائمة تعليقات الطلاب — للأدمن فقط */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const reviews = await getReviews();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("Dashboard reviews GET:", error);
    return NextResponse.json({ error: "فشل جلب التعليقات" }, { status: 500 });
  }
}

/** إضافة تعليق جديد — للأدمن فقط */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: {
    text?: string;
    textEn?: string | null;
    authorName?: string;
    authorTitle?: string | null;
    authorTitleEn?: string | null;
    avatarLetter?: string | null;
    imageUrl?: string | null;
    order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const text = body.text?.trim();
  const authorName = body.authorName?.trim();
  if (!text || !authorName) {
    return NextResponse.json({ error: "نص التعليق واسم الكاتب مطلوبان" }, { status: 400 });
  }
  try {
    const review = await createReview({
      text: text.slice(0, 2000),
      text_en: body.textEn?.trim().slice(0, 2000) || null,
      author_name: authorName,
      author_title: body.authorTitle?.trim().slice(0, 200) || null,
      author_title_en: body.authorTitleEn?.trim().slice(0, 200) || null,
      avatar_letter: body.avatarLetter?.trim() || null,
      image_url: body.imageUrl?.trim() || null,
      order: body.order ?? 0,
    });
    return NextResponse.json(review);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard reviews POST:", error);
    if (msg.includes("does not exist") || msg.includes("relation") || msg.includes("Review")) {
      return NextResponse.json(
        { error: "جدول التعليقات غير موجود. من لوحة Neon افتح SQL Editor ونفّذ محتوى ملف scripts/add-reviews-table.sql ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل إضافة التعليق" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getReviewById, updateReview, deleteReview } from "@/lib/db";

/** جلب تعليق واحد — للأدمن */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) {
    return NextResponse.json({ error: "التعليق غير موجود" }, { status: 404 });
  }
  return NextResponse.json(review);
}

/** تعديل تعليق — للأدمن */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) {
    return NextResponse.json({ error: "التعليق غير موجود" }, { status: 404 });
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
  try {
    const updates: Parameters<typeof updateReview>[1] = {};
    if (body.text !== undefined) updates.text = body.text.trim().slice(0, 2000);
    if (body.textEn !== undefined) updates.text_en = body.textEn?.trim().slice(0, 2000) || null;
    if (body.authorName !== undefined) updates.author_name = body.authorName.trim();
    if (body.authorTitle !== undefined) updates.author_title = body.authorTitle?.trim().slice(0, 200) || null;
    if (body.authorTitleEn !== undefined) {
      updates.author_title_en = body.authorTitleEn?.trim().slice(0, 200) || null;
    }
    if (body.avatarLetter !== undefined) updates.avatar_letter = body.avatarLetter?.trim() || null;
    if (body.imageUrl !== undefined) updates.image_url = body.imageUrl?.trim() || null;
    if (body.order !== undefined) updates.order = body.order;
    await updateReview(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dashboard reviews PUT:", error);
    return NextResponse.json({ error: "فشل تحديث التعليق" }, { status: 500 });
  }
}

/** حذف تعليق — للأدمن */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const review = await getReviewById(id);
  if (!review) {
    return NextResponse.json({ error: "التعليق غير موجود" }, { status: 404 });
  }
  try {
    await deleteReview(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dashboard reviews DELETE:", error);
    return NextResponse.json({ error: "فشل حذف التعليق" }, { status: 500 });
  }
}

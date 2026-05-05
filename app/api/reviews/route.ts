import { NextResponse } from "next/server";
import { getReviews } from "@/lib/db";

/** جلب تعليقات الطلاب للصفحة الرئيسية (عام) */
export async function GET() {
  try {
    const reviews = await getReviews();
    return NextResponse.json(reviews);
  } catch (error) {
    console.error("API reviews:", error);
    return NextResponse.json(
      { error: "فشل جلب التعليقات" },
      { status: 500 }
    );
  }
}

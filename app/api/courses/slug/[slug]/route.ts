import { NextRequest, NextResponse } from "next/server";
import { getCourseWithContent } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const data = await getCourseWithContent(slug);
    if (!data?.course) {
      return NextResponse.json({ error: "الدورة غير موجودة" }, { status: 404 });
    }
    const course = { ...data.course, lessons: data.lessons, quizzes: data.quizzes };
    return NextResponse.json(course);
  } catch (error) {
    console.error("API course by slug:", error);
    return NextResponse.json(
      { error: "فشل جلب الدورة" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getHomepageSettings } from "@/lib/db";

/** جلب إعدادات الصفحة الرئيسية (عام — للصفحة الرئيسية والهيدر) */
export async function GET() {
  try {
    const settings = await getHomepageSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("API settings/homepage:", error);
    return NextResponse.json(
      { teacherImageUrl: "/instructor.png", heroTitle: "أستاذ / عصام محي", heroSlogan: "ادرسها... يمكن تفهم المعلومة صح!", platformName: "منصة أستاذ عصام محي" },
      { status: 200 }
    );
  }
}

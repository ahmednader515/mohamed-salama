import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCategoriesForDashboard } from "@/lib/db";

/** أقسام لوحة الدورات — المدرس يرى أقسامه فقط؛ الأدمن/المساعد يرون أقسام المنصة والأدمن */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const categories = await getCategoriesForDashboard(session.user.id, role);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("API categories:", error);
    return NextResponse.json(
      { error: "فشل جلب التصنيفات" },
      { status: 500 }
    );
  }
}

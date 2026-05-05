import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listActivationCodes,
  listActivationCodesForTeacher,
  createActivationCodes,
  deleteActivationCodes,
  getCourseById,
} from "@/lib/db";
import { canManageCourse } from "@/lib/permissions";

/** قائمة أكواد التفعيل — للأدمن/مساعد الأدمن. اختياري: courseId */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId") || undefined;
    const codes =
      session.user.role === "TEACHER"
        ? await listActivationCodesForTeacher(session.user.id, courseId ?? null)
        : await listActivationCodes(courseId ?? null);
    return NextResponse.json(codes);
  } catch (error) {
    console.error("Dashboard codes GET:", error);
    return NextResponse.json({ error: "فشل جلب الأكواد" }, { status: 500 });
  }
}

/** إنشاء أكواد تفعيل لدورة — للأدمن/مساعد الأدمن */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: { courseId?: string; count?: number; lessonIds?: string[]; quizIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const courseId = body.courseId?.trim();
  const count = Math.min(Math.max(Number(body.count) || 1, 1), 500);
  const lessonIds = Array.isArray(body.lessonIds) ? body.lessonIds.filter((x) => typeof x === "string") : [];
  const quizIds = Array.isArray(body.quizIds) ? body.quizIds.filter((x) => typeof x === "string") : [];
  if (!courseId) {
    return NextResponse.json({ error: "معرف الدورة مطلوب" }, { status: 400 });
  }
  if (session.user.role === "TEACHER") {
    const course = await getCourseById(courseId);
    const createdBy = course ? ((course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null) : null;
    if (!course || !canManageCourse("TEACHER", session.user.id, createdBy)) {
      return NextResponse.json({ error: "غير مصرح بتعديل هذه الدورة" }, { status: 403 });
    }
  }
  try {
    const created = await createActivationCodes(
      courseId,
      count,
      lessonIds.length > 0 ? lessonIds : null,
      quizIds.length > 0 ? quizIds : null
    );
    return NextResponse.json({ created, count: created.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Dashboard codes POST:", error);
    if (msg.includes("ActivationCode") || msg.includes("ActivationCodeLesson") || msg.includes("does not exist") || msg.includes("relation")) {
      return NextResponse.json(
        { error: "جداول أكواد التفعيل غير موجودة/ناقصة. نفّذ scripts/add-activation-codes.sql من لوحة Neon ثم أعد المحاولة." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "فشل إنشاء الأكواد" }, { status: 500 });
  }
}

/** حذف أكواد بالمعرفات — للأدمن/مساعد الأدمن */
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  let ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "لم يتم تحديد أكواد للحذف" }, { status: 400 });
  }
  if (session.user.role === "TEACHER") {
    const mine = await listActivationCodesForTeacher(session.user.id);
    const allowed = new Set(mine.map((x) => String((x as { id?: string }).id ?? "")));
    ids = ids.filter((id) => allowed.has(id));
    if (ids.length === 0) {
      return NextResponse.json({ error: "لا يمكن حذف أكواد غير تابعة لكورساتك" }, { status: 403 });
    }
  }
  try {
    await deleteActivationCodes(ids);
    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error) {
    console.error("Dashboard codes DELETE:", error);
    return NextResponse.json({ error: "فشل حذف الأكواد" }, { status: 500 });
  }
}

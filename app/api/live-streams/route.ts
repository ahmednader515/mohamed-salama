import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseById, getLiveStreamsAll, getLiveStreamsForTeacher, createLiveStream } from "@/lib/db";

/** قائمة كل البثوث — للأدمن ومساعد الأدمن؛ للمدرس: بثوث كورساته فقط */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const streams =
    session.user.role === "TEACHER"
      ? await getLiveStreamsForTeacher(session.user.id)
      : await getLiveStreamsAll();
  return NextResponse.json(streams);
}

/** إنشاء بث مباشر جديد */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  let body: {
    courseId: string;
    title: string;
    titleAr?: string | null;
    provider: "zoom" | "google_meet";
    meetingUrl: string;
    meetingId?: string | null;
    meetingPassword?: string | null;
    scheduledAt: string;
    description?: string | null;
    order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const { courseId, title, provider, meetingUrl, scheduledAt } = body;
  if (!courseId?.trim() || !title?.trim() || !provider || !meetingUrl?.trim() || !scheduledAt) {
    return NextResponse.json({ error: "المعلومات الناقصة: الكورس، العنوان، نوع البث، الرابط، وموعد البث مطلوبة" }, { status: 400 });
  }
  if (provider !== "zoom" && provider !== "google_meet") {
    return NextResponse.json({ error: "نوع البث يجب أن يكون zoom أو google_meet" }, { status: 400 });
  }
  if (session.user.role === "TEACHER") {
    const course = await getCourseById(courseId.trim());
    const createdBy = course ? ((course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null) : null;
    if (!course || !canManageCourse("TEACHER", session.user.id, createdBy)) {
      return NextResponse.json({ error: "غير مصرح بإضافة بث لهذا الكورس" }, { status: 403 });
    }
  }
  try {
    const stream = await createLiveStream({
      course_id: courseId.trim(),
      title: title.trim(),
      title_ar: body.titleAr?.trim() || null,
      provider,
      meeting_url: meetingUrl.trim(),
      meeting_id: body.meetingId?.trim() || null,
      meeting_password: body.meetingPassword?.trim() || null,
      scheduled_at: new Date(scheduledAt),
      description: body.description?.trim() || null,
      order: body.order ?? 0,
    });
    return NextResponse.json(stream);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "فشل إنشاء البث المباشر" }, { status: 500 });
  }
}

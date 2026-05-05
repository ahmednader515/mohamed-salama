import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageCourse } from "@/lib/permissions";
import { getCourseById, getLiveStreamById, updateLiveStream, deleteLiveStream } from "@/lib/db";

async function assertStaffCanAccessStream(
  role: string,
  userId: string,
  stream: { courseId?: string; course_id?: string } | null,
): Promise<boolean> {
  if (!stream) return false;
  const cid = (stream as { courseId?: string }).courseId ?? (stream as { course_id?: string }).course_id ?? "";
  if (!cid) return false;
  const course = await getCourseById(cid);
  if (!course) return false;
  const createdBy = (course as { createdById?: string | null; created_by_id?: string | null }).createdById ?? (course as { created_by_id?: string | null }).created_by_id ?? null;
  return canManageCourse(role, userId, createdBy);
}

/** جلب بث واحد */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const stream = await getLiveStreamById(id);
  if (!stream) return NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
  const ok = await assertStaffCanAccessStream(session.user.role, session.user.id, stream as { course_id?: string });
  if (!ok) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  return NextResponse.json(stream);
}

/** تحديث بث مباشر */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getLiveStreamById(id);
  if (!existing) return NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
  const okPut = await assertStaffCanAccessStream(session.user.role, session.user.id, existing as { course_id?: string });
  if (!okPut) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  let body: {
    courseId?: string;
    title?: string;
    titleAr?: string | null;
    provider?: "zoom" | "google_meet";
    meetingUrl?: string;
    meetingId?: string | null;
    meetingPassword?: string | null;
    scheduledAt?: string;
    description?: string | null;
    order?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  if (body.provider !== undefined && body.provider !== "zoom" && body.provider !== "google_meet") {
    return NextResponse.json({ error: "نوع البث يجب أن يكون zoom أو google_meet" }, { status: 400 });
  }
  try {
    if (body.courseId !== undefined) await updateLiveStream(id, { course_id: body.courseId });
    if (body.title !== undefined) await updateLiveStream(id, { title: body.title });
    if (body.titleAr !== undefined) await updateLiveStream(id, { title_ar: body.titleAr });
    if (body.provider !== undefined) await updateLiveStream(id, { provider: body.provider });
    if (body.meetingUrl !== undefined) await updateLiveStream(id, { meeting_url: body.meetingUrl });
    if (body.meetingId !== undefined) await updateLiveStream(id, { meeting_id: body.meetingId });
    if (body.meetingPassword !== undefined) await updateLiveStream(id, { meeting_password: body.meetingPassword });
    if (body.scheduledAt !== undefined) await updateLiveStream(id, { scheduled_at: new Date(body.scheduledAt) });
    if (body.description !== undefined) await updateLiveStream(id, { description: body.description });
    if (body.order !== undefined) await updateLiveStream(id, { order: body.order });
    const updated = await getLiveStreamById(id);
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "فشل التحديث" }, { status: 500 });
  }
}

/** حذف بث مباشر */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "ASSISTANT_ADMIN" && session.user.role !== "TEACHER")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const existing = await getLiveStreamById(id);
  if (!existing) return NextResponse.json({ error: "البث غير موجود" }, { status: 404 });
  const okDel = await assertStaffCanAccessStream(session.user.role, session.user.id, existing as { course_id?: string });
  if (!okDel) return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  await deleteLiveStream(id);
  return NextResponse.json({ ok: true });
}

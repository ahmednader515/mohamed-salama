import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnrollment, deleteEnrollment } from "@/lib/db";

/** إزالة طالب من دورة - للأدمن فقط */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; courseId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const { id: userId, courseId } = await params;

  const enrollment = await getEnrollment(userId, courseId);
  if (!enrollment) {
    return NextResponse.json({ error: "التسجيل غير موجود" }, { status: 404 });
  }

  await deleteEnrollment(userId, courseId);

  return NextResponse.json({ success: true });
}

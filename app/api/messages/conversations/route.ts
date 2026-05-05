import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserById, getOrCreateConversation, getConversationsByStaffId, getConversationsByStudentId } from "@/lib/db";

/** قائمة المحادثات أو إنشاء محادثة جديدة (للأدمن/مساعد عند اختيار طالب) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const role = session.user.role as string;
  if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
    const list = await getConversationsByStaffId(session.user.id);
    return NextResponse.json(list);
  }
  if (role === "STUDENT") {
    const list = await getConversationsByStudentId(session.user.id);
    return NextResponse.json(list);
  }
  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}

/** إنشاء أو جلب محادثة: أدمن/مساعد مع طالب، أو طالب مع أدمن/مساعد */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const role = session.user.role as string;

  let body: { studentId?: string; staffId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  if (role === "ADMIN" || role === "ASSISTANT_ADMIN" || role === "TEACHER") {
    const studentId = body.studentId?.trim();
    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 });
    }
    const conversation = await getOrCreateConversation(session.user.id, studentId);
    return NextResponse.json(conversation);
  }

  if (role === "STUDENT") {
    const staffId = body.staffId?.trim();
    if (!staffId) {
      return NextResponse.json({ error: "معرف الموظف مطلوب" }, { status: 400 });
    }
    const staff = await getUserById(staffId);
    if (!staff || (staff.role !== "ADMIN" && staff.role !== "ASSISTANT_ADMIN")) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const conversation = await getOrCreateConversation(staffId, session.user.id);
    return NextResponse.json(conversation);
  }

  return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
}

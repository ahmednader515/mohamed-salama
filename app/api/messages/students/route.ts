import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStudentsEnrolledInTeacherCourses, getUsersByRole } from "@/lib/db";

/** قائمة الطلبة (للأدمن/مساعد لاختيار طالب للتواصل) — للمدرس: طلاب اشتركوا في كورساته */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const role = session.user.role as string;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const students =
    role === "TEACHER"
      ? await getStudentsEnrolledInTeacherCourses(session.user.id)
      : await getUsersByRole("STUDENT");
  return NextResponse.json(students.map((u) => ({ id: u.id, name: u.name, email: u.email })));
}

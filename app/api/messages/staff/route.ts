import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStaffForStudentMessaging } from "@/lib/db";

/** قائمة الموظفين الذين يمكن للطالب مراسلتهم (أدمن، مساعد أدمن) */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const list = await getStaffForStudentMessaging();
  return NextResponse.json(list);
}

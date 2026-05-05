import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearCurrentSessionId } from "@/lib/db";

/** مسح جلسة المستخدم الحالية من قاعدة البيانات عند تسجيل الخروج */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true });
  }
  try {
    await clearCurrentSessionId((session.user as { id: string }).id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

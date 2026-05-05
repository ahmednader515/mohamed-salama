import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getUserByEmailExcludingId, updateUser, clearCurrentSessionId } from "@/lib/db";

const ROLES = ["ADMIN", "ASSISTANT_ADMIN", "STUDENT", "TEACHER"] as const;

const updateSchema = z.object({
  name: z.string().min(2, "الاسم حرفين على الأقل").optional(),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل").optional(),
  email: z.string().email("بريد إلكتروني غير صالح").optional(),
  role: z.enum(ROLES).optional(),
  teacherSubject: z.string().max(500).optional().nullable(),
  teacherAvatarUrl: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" },
      { status: 400 }
    );
  }

  const data: {
    name?: string;
    email?: string;
    role?: "ADMIN" | "ASSISTANT_ADMIN" | "STUDENT" | "TEACHER";
    password_hash?: string;
    teacher_subject?: string | null;
    teacher_avatar_url?: string | null;
  } = {};

  if (parsed.data.name !== undefined) data.name = parsed.data.name.trim();

  if (parsed.data.email !== undefined) {
    const email = parsed.data.email.trim();
    const existing = await getUserByEmailExcludingId(email, session.user.id);
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم لحساب آخر" }, { status: 400 });
    }
    data.email = email;
  }

  if (parsed.data.role !== undefined) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "لا يمكنك تغيير الرتبة" }, { status: 403 });
    }
    data.role = parsed.data.role;
  }

  if (parsed.data.password !== undefined) {
    data.password_hash = await hash(parsed.data.password, 12);
  }

  if (parsed.data.teacherSubject !== undefined && session.user.role === "TEACHER") {
    data.teacher_subject = parsed.data.teacherSubject?.trim() || null;
  }
  if (parsed.data.teacherAvatarUrl !== undefined && session.user.role === "TEACHER") {
    const u = parsed.data.teacherAvatarUrl?.trim();
    data.teacher_avatar_url = u === "" ? null : u ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "لا يوجد شيء للتحديث" }, { status: 400 });
  }

  await updateUser(session.user.id, data);

  const roleChanged = data.role !== undefined;
  if (roleChanged) {
    await clearCurrentSessionId(session.user.id);
  }

  return NextResponse.json({ success: true, roleChanged: !!roleChanged });
}

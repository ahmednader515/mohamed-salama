import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { createUser, getTeachersFeatureEnabled, getUserByEmail, getUsersByRole } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const enabled = await getTeachersFeatureEnabled();
  const teachers = enabled ? await getUsersByRole("TEACHER") : [];
  return NextResponse.json({
    teachersEnabled: enabled,
    teachers: teachers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      student_number: u.student_number ?? null,
      teacher_subject: (u as { teacher_subject?: string | null }).teacher_subject ?? null,
      teacher_avatar_url: (u as { teacher_avatar_url?: string | null }).teacher_avatar_url ?? null,
      teacher_homepage_order:
        (u as { teacher_homepage_order?: number | null }).teacher_homepage_order ?? null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "فعّل ميزة المدرسين أولاً من لوحة التحكم" }, { status: 400 });
  }
  let body: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    teacherSubject?: string | null;
    teacherAvatarUrl?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }
  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const phone = body.phone?.trim() || null;
  if (!name || !email || !password) {
    return NextResponse.json({ error: "الاسم والبريد وكلمة المرور مطلوبة" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    return NextResponse.json({ error: "البريد مستخدم مسبقاً" }, { status: 400 });
  }
  const digits = phone ? phone.replace(/\D/g, "") : "";
  const student_number = digits.length >= 10 ? digits : null;
  const password_hash = await hash(password, 12);
  const teacher_subject =
    body.teacherSubject === undefined || body.teacherSubject === null
      ? null
      : String(body.teacherSubject).trim().slice(0, 500) || null;
  const teacher_avatar_url =
    body.teacherAvatarUrl === undefined || body.teacherAvatarUrl === null
      ? null
      : String(body.teacherAvatarUrl).trim().slice(0, 2000) || null;
  try {
    const user = await createUser({
      email,
      password_hash,
      name,
      role: "TEACHER",
      student_number,
      guardian_number: null,
      teacher_subject,
      teacher_avatar_url,
    });
    return NextResponse.json({ success: true, id: user.id, email: user.email });
  } catch (e) {
    console.error("POST /api/dashboard/teachers", e);
    const raw = e instanceof Error ? e.message : String(e);
    const lower = raw.toLowerCase();
    if (lower.includes("duplicate") || lower.includes("unique")) {
      return NextResponse.json({ error: "البريد الإلكتروني مستخدم مسبقاً" }, { status: 400 });
    }
    if (lower.includes("check") || lower.includes("userrole") || lower.includes("enum")) {
      return NextResponse.json(
        {
          error:
            "قاعدة البيانات لا تقبل رتبة «مدرس» بعد. حدّث قاعدة البيانات (قيمة TEACHER في نوع UserRole أو قيد role) ثم أعد المحاولة. يمكن تشغيل scripts/add-teachers-multi.sql كاملاً على Neon.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "تعذر إنشاء الحساب. إن استمر الخطأ، راجع سجلات السيرفر أو نفّذ سكربت add-teachers-multi.sql على قاعدة البيانات.", detail: raw },
      { status: 500 },
    );
  }
}

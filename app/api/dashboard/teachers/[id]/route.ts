import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions } from "@/lib/auth";
import {
  deleteTeacherUser,
  getUserByEmailExcludingId,
  getUserById,
  updateUser,
} from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  const target = await getUserById(id);
  if (!target || target.role !== "TEACHER") {
    return NextResponse.json({ error: "المدرس غير موجود" }, { status: 404 });
  }

  let body: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string | null;
    teacherSubject?: string | null;
    teacherAvatarUrl?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const patch: Parameters<typeof updateUser>[1] = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "الاسم لا يمكن أن يكون فارغاً" }, { status: 400 });
    patch.name = name;
  }

  if (body.email !== undefined) {
    const email = body.email.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "البريد مطلوب" }, { status: 400 });
    const dup = await getUserByEmailExcludingId(email, id);
    if (dup) return NextResponse.json({ error: "البريد مستخدم مسبقاً" }, { status: 400 });
    patch.email = email;
  }

  if (body.password !== undefined && String(body.password).trim() !== "") {
    const password = String(body.password).trim();
    if (password.length < 6) {
      return NextResponse.json({ error: "كلمة المرور 6 أحرف على الأقل" }, { status: 400 });
    }
    patch.password_hash = await hash(password, 12);
  }

  if (body.phone !== undefined) {
    const digits = String(body.phone ?? "").replace(/\D/g, "");
    patch.student_number = digits.length >= 10 ? digits : null;
  }

  if (body.teacherSubject !== undefined) {
    const s = body.teacherSubject === null ? "" : String(body.teacherSubject).trim();
    patch.teacher_subject = s.length ? s.slice(0, 500) : null;
  }

  if (body.teacherAvatarUrl !== undefined) {
    const u = body.teacherAvatarUrl === null ? "" : String(body.teacherAvatarUrl).trim();
    patch.teacher_avatar_url = u.length ? u.slice(0, 2000) : null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "لا توجد حقول للتحديث" }, { status: 400 });
  }

  try {
    await updateUser(id, patch);
  } catch (e) {
    console.error("PATCH /api/dashboard/teachers/[id]", e);
    return NextResponse.json({ error: "فشل تحديث الحساب" }, { status: 500 });
  }

  const updated = await getUserById(id);
  return NextResponse.json({
    success: true,
    teacher: updated
      ? {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          student_number: updated.student_number ?? null,
          teacher_subject: (updated as { teacher_subject?: string | null }).teacher_subject ?? null,
          teacher_avatar_url: (updated as { teacher_avatar_url?: string | null }).teacher_avatar_url ?? null,
        }
      : null,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.user.id) {
    return NextResponse.json({ error: "لا يمكن حذف حسابك الحالي" }, { status: 400 });
  }
  const target = await getUserById(id);
  if (!target || target.role !== "TEACHER") {
    return NextResponse.json({ error: "المدرس غير موجود" }, { status: 404 });
  }
  try {
    await deleteTeacherUser(id);
  } catch (e) {
    console.error("DELETE /api/dashboard/teachers/[id]", e);
    const raw = e instanceof Error ? e.message : String(e);
    const lower = raw.toLowerCase();
    if (lower.includes("foreign key") || lower.includes("violates")) {
      return NextResponse.json(
        {
          error:
            "تعذر الحذف بسبب ارتباطات أخرى في قاعدة البيانات (مثلاً محادثات أو سجلات). احذف الارتباطات أولاً أو تواصل مع الدعم.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "فشل حذف الحساب", detail: raw }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getUserById } from "@/lib/db";
import { ProfileForm } from "./ProfileForm";
import { TeacherPublicProfileForm } from "./TeacherPublicProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await getUserById(session.user.id);
  if (!user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const isStaff = isAdmin || session.user.role === "ASSISTANT_ADMIN";
  const isTeacher = session.user.role === "TEACHER";

  const teacherSubject =
    (user as { teacher_subject?: string | null }).teacher_subject?.trim() ?? "";
  const teacherAvatar =
    (user as { teacher_avatar_url?: string | null }).teacher_avatar_url?.trim() ?? "";

  return (
    <div>
      <Link
        href="/dashboard"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة للوحة التحكم
      </Link>
      <h2 className="mt-6 text-xl font-bold text-[var(--color-foreground)]">
        تعديل بيانات الحساب
      </h2>
      {!isStaff && !isTeacher && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          البريد الحالي: {user.email} (لا يمكن تغييره من هنا)
        </p>
      )}
      {isTeacher && (
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          البريد أو رقم الهاتف المسجّل: {user.email}
          {user.student_number ? ` · هاتف: ${user.student_number}` : ""} (للتعديل تواصل مع الأدمن إن لزم)
        </p>
      )}
      <ProfileForm
        defaultName={user.name ?? ""}
        defaultEmail={isStaff ? (user.email ?? "") : undefined}
        defaultRole={isStaff ? (user.role ?? "STUDENT") : undefined}
        canChangeRole={isAdmin}
      />
      {isTeacher ? (
        <TeacherPublicProfileForm defaultSubject={teacherSubject} defaultAvatarUrl={teacherAvatar} />
      ) : null}
    </div>
  );
}

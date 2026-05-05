"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

/**
 * عند تسجيل الدخول من جهاز آخر، الجلسة الحالية تُلغى ويُعاد forceLogout.
 * نعرض رسالة للمستخدم ثم نُسجّل الخروج.
 */
export function ForceLogoutGuard() {
  const { data: session, status } = useSession();
  const [done, setDone] = useState(false);

  const forceLogout = (session as { forceLogout?: boolean })?.forceLogout === true;

  useEffect(() => {
    if (status !== "authenticated" || !forceLogout || done) return;
    setDone(true);
    signOut({ callbackUrl: "/login?reason=session_ended_elsewhere" });
  }, [status, forceLogout, done]);

  if (status !== "authenticated" || !forceLogout) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md rounded-[var(--radius-card)] border border-amber-200 bg-[var(--color-surface)] p-6 shadow-2xl dark:border-amber-800 sm:p-8">
        <h2 className="text-xl font-bold text-amber-700 dark:text-amber-300">
          تم تسجيل الدخول من جهاز آخر
        </h2>
        <p className="mt-3 text-sm text-[var(--color-foreground)]">
          تم تسجيل الدخول بهذا الحساب من جهاز أو متصفح آخر. تم تسجيل خروجك من هذا الجهاز لأسباب أمنية.
        </p>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          إذا تشك أن الحساب مخترق، غيّر كلمة المرور وبيانات الحساب من صفحة &quot;تعديل بيانات الحساب&quot; بعد تسجيل الدخول مرة أخرى.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login"
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2.5 text-center font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            تسجيل الدخول مرة أخرى
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

const ROLES = [
  { value: "ADMIN", label: "أدمن" },
  { value: "ASSISTANT_ADMIN", label: "مساعد أدمن" },
  { value: "STUDENT", label: "طالب" },
] as const;

type Props = {
  defaultName: string;
  defaultEmail?: string;
  defaultRole?: string;
  canChangeRole?: boolean;
};

export function ProfileForm({ defaultName, defaultEmail, defaultRole, canChangeRole }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [role, setRole] = useState(defaultRole ?? "STUDENT");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const hasChanges =
    name !== defaultName ||
    (defaultEmail !== undefined && email !== defaultEmail) ||
    (canChangeRole && defaultRole !== undefined && role !== defaultRole) ||
    password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password && password !== confirmPassword) {
      setError("كلمة المرور وتأكيدها غير متطابقتين");
      return;
    }
    if (password && password.length < 6) {
      setError("كلمة المرور 6 أحرف على الأقل");
      return;
    }
    setLoading(true);
    const body: { name?: string; email?: string; role?: string; password?: string } = {};
    if (name.trim()) body.name = name.trim();
    if (defaultEmail !== undefined && email.trim()) body.email = email.trim();
    if (canChangeRole && defaultRole !== undefined && role) body.role = role;
    if (password) body.password = password;

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "فشل التحديث");
      return;
    }
    if (data.roleChanged) {
      setSuccess("تم حفظ التغييرات. جاري تسجيل الخروج لتطبيق الرتبة الجديدة...");
      await signOut({ callbackUrl: "/login" });
      router.refresh();
      return;
    }
    setSuccess("تم تحديث البيانات بنجاح");
    setPassword("");
    setConfirmPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
          {success}
        </div>
      )}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-[var(--color-foreground)]">
          الاسم
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          minLength={2}
          className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        />
      </div>
      {defaultEmail !== undefined && (
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--color-foreground)]">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
            required
          />
        </div>
      )}
      {canChangeRole && defaultRole !== undefined && (
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-[var(--color-foreground)]">
            رتبة الحساب
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-foreground)]">
          كلمة مرور جديدة (اتركها فارغة إن لم تُرد التغيير)
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-[var(--color-foreground)]">
          تأكيد كلمة المرور
        </label>
        <input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading || !hasChanges}
        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-2 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
      </button>
    </form>
  );
}

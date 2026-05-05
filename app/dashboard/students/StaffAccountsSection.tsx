"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable } from "@/lib/i18n/dashboard-table";

type UserRow = { id: string; name: string | null; email: string | null; role: string };

const ROLE_HEADER_KEYS: Record<string, string> = {
  ADMIN: "header.role.ADMIN",
  ASSISTANT_ADMIN: "header.role.ASSISTANT_ADMIN",
  STUDENT: "header.role.STUDENT",
};

const ROLE_OPTIONS = ["ADMIN", "ASSISTANT_ADMIN", "STUDENT"] as const;

function translateRole(role: string, t: (key: string, fallback?: string) => string): string {
  const key = ROLE_HEADER_KEYS[role];
  return key ? t(key, role) : role;
}

export function StaffAccountsSection({
  admins,
  assistantAdmins,
}: {
  admins: UserRow[];
  assistantAdmins: UserRow[];
}) {
  const t = useT();
  const { dir, thClassCompact } = useDashboardTable();
  const router = useRouter();
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const staff = [
    ...admins.map((u) => ({ ...u, roleLabel: translateRole(u.role, t) })),
    ...assistantAdmins.map((u) => ({ ...u, roleLabel: translateRole(u.role, t) })),
  ];

  function openEdit(u: UserRow) {
    setEditUser(u);
    setEditName(u.name ?? "");
    setEditEmail(u.email ?? "");
    setEditRole(u.role);
    setEditPassword("");
    setError("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError("");
    setLoading(true);
    const body: { name?: string; email?: string; role?: string; password?: string } = {
      name: editName.trim(),
      email: editEmail.trim(),
      role: editRole,
    };
    if (editPassword.trim().length >= 6) body.password = editPassword.trim();

    const res = await fetch(`/api/dashboard/students/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? t("dashboard.studentsPage.errorUpdateFailed", "Update failed"));
      return;
    }
    setEditUser(null);
    router.refresh();
  }

  if (staff.length === 0) return null;

  const dash = t("dashboard.studentsPage.dash", "—");

  return (
    <section className="mb-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">
        {t("dashboard.studentsPage.staffTableTitle", "Admin and assistant admin accounts")}
      </h3>
      <div className="overflow-x-auto">
        <table dir={dir} className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className={thClassCompact}>{t("dashboard.studentsPage.colName", "Name")}</th>
              <th className={thClassCompact}>{t("dashboard.studentsPage.colEmailFull", "Email")}</th>
              <th className={thClassCompact}>{t("dashboard.studentsPage.colRole", "Role")}</th>
              <th className={thClassCompact}>{t("dashboard.studentsPage.colEdit", "Edit")}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]/50 last:border-0">
                <td className="py-2 px-3 text-[var(--color-foreground)]">{u.name ?? dash}</td>
                <td className="py-2 px-3 text-[var(--color-muted)]">{u.email ?? dash}</td>
                <td className="py-2 px-3 text-[var(--color-foreground)]">{u.roleLabel}</td>
                <td className="py-2 px-3">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {t("dashboard.studentsPage.edit", "Edit")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            dir={dir}
            className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
              {t("dashboard.studentsPage.editStaffTitlePrefix", "Edit account —")}{" "}
              {translateRole(editUser.role, t)}
            </h3>
            <form onSubmit={handleSave} className="mt-4 space-y-3">
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">
                  {t("dashboard.studentsPage.nameLabel", "Name")}
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">
                  {t("dashboard.studentsPage.emailLabel", "Email")}
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">
                  {t("dashboard.studentsPage.colRole", "Role")}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {translateRole(r, t)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">
                  {t("dashboard.studentsPage.newPasswordStaff", "New password (optional)")}
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={t(
                    "dashboard.studentsPage.passwordKeepCurrentPlaceholder",
                    "Leave blank to keep the current password",
                  )}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditUser(null);
                    setError("");
                  }}
                  className="flex-1 rounded-[var(--radius-btn)] border border-[var(--color-border)] py-2 text-sm font-medium"
                >
                  {t("dashboard.studentsPage.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading
                    ? t("dashboard.studentsPage.saving", "Saving...")
                    : t("dashboard.studentsPage.save", "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

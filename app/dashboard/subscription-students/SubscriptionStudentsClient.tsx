"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";
import { fillMessage } from "@/lib/i18n/interpolate";

export type SubscriptionStudentRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string | null;
  planName: string | null;
  pricePaid: number;
  expiresAtIso: string;
  createdAtIso: string;
  isActive: boolean;
};

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatUiDate(iso: string, dateLocale: string): string {
  try {
    return new Intl.DateTimeFormat(dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function SubscriptionStudentsClient({
  initialRows,
  totalRevenue,
}: {
  initialRows: SubscriptionStudentRow[];
  totalRevenue: number;
}) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const Sc = "dashboard.subscriptionStudentsClient";
  const { dir, thClass } = useDashboardTable();
  const egp = t("common.egyptianPoundShort");
  const dateLoc = dateLocaleForUi(locale);
  const [rows, setRows] = useState(initialRows);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<SubscriptionStudentRow | null>(null);
  const [editLocal, setEditLocal] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [revenue, setRevenue] = useState(totalRevenue);

  useEffect(() => {
    setRows(initialRows);
    setRevenue(totalRevenue);
  }, [initialRows, totalRevenue]);

  const reload = useCallback(async () => {
    const res = await fetch("/api/dashboard/platform-subscriptions", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { subscriptions?: SubscriptionStudentRow[] };
    if (data.subscriptions) {
      setRows(data.subscriptions);
      setRevenue(data.subscriptions.reduce((sum, r) => sum + Number(r.pricePaid || 0), 0));
    }
  }, []);

  function openEdit(row: SubscriptionStudentRow) {
    setError("");
    setSuccess("");
    setEditing(row);
    setEditLocal(toDatetimeLocalValue(row.expiresAtIso));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    setSuccess("");
    const d = new Date(editLocal);
    if (Number.isNaN(d.getTime())) {
      setError(t(`${Sc}.invalidDate`));
      return;
    }
    setEditLoading(true);
    const res = await fetch(`/api/dashboard/platform-subscriptions/${encodeURIComponent(editing.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresAt: d.toISOString() }),
    });
    const data = await res.json().catch(() => ({}));
    setEditLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Sc}.saveFailed`));
      return;
    }
    setSuccess(t(`${Sc}.saveSuccess`));
    setEditing(null);
    await reload();
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setError("");
    setSuccess("");
    setDeleteLoading(true);
    const res = await fetch(`/api/dashboard/platform-subscriptions/${encodeURIComponent(deleteId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    setDeleteLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Sc}.deleteFailed`));
      setDeleteId(null);
      return;
    }
    setSuccess(t(`${Sc}.deleteSuccess`));
    setDeleteId(null);
    await reload();
    router.refresh();
  }

  return (
    <div className="space-y-4" dir={dir}>
      {error ? (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
          {success}
        </div>
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]">
        <p className="text-sm text-[var(--color-muted)]">{t(`${Sc}.totalRevenueLabel`)}</p>
        <p className="mt-1 text-2xl font-bold text-[var(--color-primary)]">{revenue.toFixed(2)} {egp}</p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]" dir={dir}>
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
              <th className={thClass}>{t(`${Sc}.colStudent`)}</th>
              <th className={thClass}>{t(`${Sc}.colEmail`)}</th>
              <th className={thClass}>{t(`${Sc}.colPlan`)}</th>
              <th className={thClass}>{t(`${Sc}.colAmount`)}</th>
              <th className={thClass}>{t(`${Sc}.colPurchased`)}</th>
              <th className={thClass}>{t(`${Sc}.colExpires`)}</th>
              <th className={thClass}>{t(`${Sc}.colStatus`)}</th>
              <th className={thClass}>{t(`${Sc}.colActions`)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[var(--color-muted)]">
                  {t(`${Sc}.emptyRows`)}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border)]/70">
                  <td className="px-3 py-3 font-medium text-[var(--color-foreground)]">{r.userName}</td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">{r.userEmail}</td>
                  <td className="px-3 py-3 text-[var(--color-muted)]">{r.planName ?? "—"}</td>
                  <td className="px-3 py-3 tabular-nums">{Number(r.pricePaid).toFixed(2)} {egp}</td>
                  <td className="px-3 py-3 text-xs text-[var(--color-muted)]">{formatUiDate(r.createdAtIso, dateLoc)}</td>
                  <td className="px-3 py-3 text-xs text-[var(--color-muted)]">{formatUiDate(r.expiresAtIso, dateLoc)}</td>
                  <td className="px-3 py-3">
                    {r.isActive ? (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-700 dark:text-emerald-300">
                        {t(`${Sc}.statusActive`)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-500/15 px-2 py-0.5 text-xs text-[var(--color-muted)]">
                        {t(`${Sc}.statusEnded`)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-2 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                      >
                        {t(`${Sc}.edit`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          setSuccess("");
                          setDeleteId(r.id);
                        }}
                        className="rounded-[var(--radius-btn)] border border-red-500/40 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        {t(`${Sc}.delete`)}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Sc}.modalEditTitle`)}</h3>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {fillMessage(t(`${Sc}.modalEditSubtitlePlan`), {
                name: editing.userName,
                plan: editing.planName ?? t(`${Sc}.noPlanName`),
              })}
            </p>
            <form onSubmit={(e) => void saveEdit(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Sc}.labelExpires`)}</label>
                <input
                  type="datetime-local"
                  required
                  value={editLocal}
                  onChange={(e) => setEditLocal(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Sc}.expiresHint`)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {editLoading ? t(`${Sc}.saveBusy`) : t(`${Sc}.saveIdle`)}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                >
                  {t(`${Sc}.cancel`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteId(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Sc}.deleteModalTitle`)}</h3>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{t(`${Sc}.deleteModalBody`)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => void confirmDelete()}
                className="rounded-[var(--radius-btn)] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteLoading ? t(`${Sc}.confirmDeleteBusy`) : t(`${Sc}.confirmDelete`)}
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
              >
                {t(`${Sc}.cancel`)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

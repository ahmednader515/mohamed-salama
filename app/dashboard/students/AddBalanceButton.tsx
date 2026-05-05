"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/LocaleProvider";
import { getDir } from "@/lib/i18n/core";

export function AddBalanceButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const t = useT();
  const locale = useLocale();
  const dir = getDir(locale);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (Number.isNaN(num) || num <= 0) {
      setError(t("dashboard.studentsPage.invalidAmountError", "Enter a valid amount"));
      return;
    }
    setError("");
    setLoading(true);
    const res = await fetch(`/api/dashboard/students/${studentId}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: num }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? t("dashboard.studentsPage.addBalanceFailed", "Failed to add balance"));
      return;
    }
    setOpen(false);
    setAmount("");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]"
      >
        {t("dashboard.studentsPage.addBalanceButton", "Add balance")}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            dir={dir}
            className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-lg"
          >
            <h3 className="font-semibold text-[var(--color-foreground)]">
              {t("dashboard.studentsPage.addBalanceModalTitlePrefix", "Add balance —")} {studentName}
            </h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("dashboard.studentsPage.amountPlaceholderEgp", "Amount (EGP)")}
                className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
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
                    ? t("dashboard.studentsPage.processing", "Working...")
                    : t("dashboard.studentsPage.add", "Add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

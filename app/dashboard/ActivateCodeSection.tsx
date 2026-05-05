"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/components/LocaleProvider";
import { getDir } from "@/lib/i18n/core";

export function ActivateCodeSection() {
  const t = useT();
  const locale = useLocale();
  const dir = getDir(locale);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setMessage({
        type: "error",
        text: t("dashboard.page.activateCode.errorEmpty", "Enter the activation code"),
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/activate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "error",
          text:
            data.error ??
            t("dashboard.page.activateCode.errorFailed", "Failed to activate the code"),
        });
        return;
      }
      setMessage({
        type: "success",
        text:
          data.message ??
          t(
            "dashboard.page.activateCode.successDefault",
            "Code activated and you were enrolled in the course successfully",
          ),
      });
      setCode("");
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: t("dashboard.page.activateCode.errorNetwork", "Something went wrong while activating"),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-2 text-lg font-semibold text-[var(--color-foreground)]">
        {t("dashboard.page.activateCode.title", "Activate a code")}
      </h2>
      <p className="mb-4 text-sm text-[var(--color-muted)]">
        {t(
          "dashboard.page.activateCode.description",
          "If you received a free activation code for a course, enter it here to get access without purchasing.",
        )}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          dir={dir}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("dashboard.page.activateCode.placeholder", "Enter activation code")}
          className="min-w-[180px] rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-sm font-mono placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading
            ? t("dashboard.page.activateCode.submitting", "Activating...")
            : t("dashboard.page.activateCode.submit", "Activate code")}
        </button>
      </form>
      {message && (
        <p
          className={`mt-3 text-sm ${message.type === "success" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

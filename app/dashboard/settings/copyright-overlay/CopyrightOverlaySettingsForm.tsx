"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

type CopyrightOverlayStyle = "floating" | "watermark";

export function CopyrightOverlaySettingsForm({
  initialStyle,
}: {
  initialStyle: CopyrightOverlayStyle;
}) {
  const router = useRouter();
  const t = useT();
  const F = "dashboard.copyrightOverlayForm";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [style, setStyle] = useState<CopyrightOverlayStyle>(initialStyle);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/dashboard/settings/copyright-overlay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copyrightOverlayStyle: style }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${F}.saveFailed`));
      setSuccess(t(`${F}.saveSuccess`));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${F}.saveErrorGeneric`));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 max-w-3xl space-y-6">
      {error ? (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-btn)] bg-emerald-500/10 px-3 py-2 text-sm text-emerald-500">
          {success}
        </div>
      ) : null}

      <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${F}.shapeHeading`)}</h3>
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] p-4 hover:bg-[var(--color-background)]/50">
          <input
            type="radio"
            name="copyright-overlay-style"
            value="floating"
            checked={style === "floating"}
            onChange={() => setStyle("floating")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-[var(--color-foreground)]">
              {t(`${F}.floatingTitle`)}
            </span>
            <span className="mt-1 block text-sm text-[var(--color-muted)]">
              {t(`${F}.floatingDescription`)}
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-btn)] border border-[var(--color-border)] p-4 hover:bg-[var(--color-background)]/50">
          <input
            type="radio"
            name="copyright-overlay-style"
            value="watermark"
            checked={style === "watermark"}
            onChange={() => setStyle("watermark")}
            className="mt-1"
          />
          <span>
            <span className="block font-medium text-[var(--color-foreground)]">
              {t(`${F}.watermarkTitle`)}
            </span>
            <span className="mt-1 block text-sm text-[var(--color-muted)]">
              {t(`${F}.watermarkDescription`)}
            </span>
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-6 py-2 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
      >
        {saving ? t(`${F}.savingSettings`) : t(`${F}.saveSettings`)}
      </button>
    </form>
  );
}

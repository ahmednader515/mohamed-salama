"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

type Props = { open: boolean; title: string; subtitle?: string };

/** طبقة تحميل فوق الصفحة أثناء حفظ/إنشاء الدورة (قد يطول الطلب) */
export function CourseFormSaveOverlay({ open, title, subtitle }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[1px]"
      role="alertdialog"
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-8 shadow-xl">
        <div
          className="h-12 w-12 shrink-0 animate-spin rounded-full border-[3px] border-[var(--color-border)] border-t-[var(--color-primary)]"
          aria-hidden
        />
        <p className="text-center text-base font-semibold text-[var(--color-foreground)]">{title}</p>
        {subtitle ? <p className="text-center text-sm text-[var(--color-muted)]">{subtitle}</p> : null}
      </div>
    </div>,
    document.body
  );
}

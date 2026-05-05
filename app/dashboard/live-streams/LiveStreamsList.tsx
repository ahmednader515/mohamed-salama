"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable, dateLocaleForUi } from "@/lib/i18n/dashboard-table";

type StreamRow = {
  id: string;
  title: string;
  titleAr: string;
  provider: string;
  meetingUrl: string;
  scheduledAt: unknown;
  course?: { id: string; title: string; slug: string };
};

export function LiveStreamsList({ streams }: { streams: StreamRow[] }) {
  const router = useRouter();
  const t = useT();
  const L = "dashboard.liveStreamsList";
  const { locale, dir, thClass } = useDashboardTable();
  const dateLocale = dateLocaleForUi(locale);
  const dash = t("dashboard.studentsPage.dash");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (d: unknown) => {
    if (!d) return dash;
    const date = typeof d === "string" ? new Date(d) : (d as Date);
    try {
      return new Intl.DateTimeFormat(dateLocale, { dateStyle: "short", timeStyle: "short" }).format(date);
    } catch {
      return dash;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t(`${L}.confirmDelete`))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/live-streams/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
      else alert(t(`${L}.deleteFailed`));
    } finally {
      setDeletingId(null);
    }
  };

  if (streams.length === 0) {
    return (
      <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-muted)]">
        {t(`${L}.emptyHint`)}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <table className="w-full text-sm" dir={dir}>
        <thead>
          <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
            <th className={thClass}>{t(`${L}.colTitle`)}</th>
            <th className={thClass}>{t(`${L}.colProvider`)}</th>
            <th className={thClass}>{t(`${L}.colCourse`)}</th>
            <th className={thClass}>{t(`${L}.colScheduled`)}</th>
            <th className={thClass}>{t(`${L}.colActions`)}</th>
          </tr>
        </thead>
        <tbody>
          {streams.map((s) => (
            <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="p-3">{s.titleAr || s.title}</td>
              <td className="p-3">{s.provider === "zoom" ? t(`${L}.providerZoom`) : t(`${L}.providerMeet`)}</td>
              <td className="p-3">{s.course?.title ?? dash}</td>
              <td className="p-3">{formatDate(s.scheduledAt)}</td>
              <td className="p-3">
                <Link
                  href={`/dashboard/live-streams/${s.id}/edit`}
                  className="ml-2 text-[var(--color-primary)] hover:underline"
                >
                  {t(`${L}.edit`)}
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                >
                  {deletingId === s.id ? t(`${L}.deleting`) : t(`${L}.delete`)}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

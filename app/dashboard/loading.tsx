import { getServerTranslator } from "@/lib/i18n/server";

export default async function DashboardLoading() {
  const t = await getServerTranslator();
  const label = t("common.loading", "Loading");

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-12"
      aria-busy="true"
      aria-label={label}
    >
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"
        aria-hidden
      />
      <p className="text-[var(--color-muted)]">{label}</p>
      <p className="text-sm text-[var(--color-muted)]">{t("common.pleaseWait", "Please wait...")}</p>
    </div>
  );
}

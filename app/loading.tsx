import { getServerTranslator } from "@/lib/i18n/server";

export default async function Loading() {
  const t = await getServerTranslator();
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4"
      aria-label={t("common.loading", "Loading")}
    >
      <div className="relative">
        <div
          className="h-14 w-14 rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)] animate-spin"
          style={{ animationDuration: "0.8s" }}
        />
        <div
          className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-[var(--color-primary)] opacity-30 animate-spin"
          style={{ animationDuration: "1.2s", animationDirection: "reverse" }}
        />
      </div>
      <div className="text-center">
        <p className="text-lg font-medium text-[var(--color-foreground)]">
          {t("common.loading", "Loading")}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("common.pleaseWait", "Please wait...")}
        </p>
      </div>
      <div className="flex gap-1.5">
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0s" }}
        />
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0.16s" }}
        />
        <span
          className="loading-dot h-2 w-2 rounded-full bg-[var(--color-primary)]"
          style={{ animationDelay: "0.32s" }}
        />
      </div>
    </div>
  );
}

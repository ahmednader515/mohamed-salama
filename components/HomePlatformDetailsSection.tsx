import type { PlatformDetailsItem, PlatformDetailsPresetIcon } from "@/lib/types";

function PresetIcon({ icon }: { icon: PlatformDetailsPresetIcon }) {
  const common = { className: "h-6 w-6", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;
  switch (icon) {
    case "book":
      return <svg viewBox="0 0 24 24" {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5V21" /></svg>;
    case "pencil":
      return <svg viewBox="0 0 24 24" {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z" /></svg>;
    case "bulb":
      return <svg viewBox="0 0 24 24" {...common}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M8 14a6 6 0 1 1 8 0c-1 1-1.5 2-1.5 3h-5C9.5 16 9 15 8 14z" /></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="3.5" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" /></svg>;
    case "rocket":
      return <svg viewBox="0 0 24 24" {...common}><path d="M5 15c-1 0-2.5 0-3 1.5S1 20 1 20s2-.5 3.5-1S6 17 6 16" /><path d="M14 10 4 20" /><path d="M12 2s5 0 8 3 3 8 3 8-4 1-8-3-3-8-3-8z" /></svg>;
    case "target":
      return <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1.5" /></svg>;
    case "certificate":
      return <svg viewBox="0 0 24 24" {...common}><path d="M7 4h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4l-3 3v-3H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" /><circle cx="12" cy="9" r="2.5" /></svg>;
    case "chat":
    default:
      return <svg viewBox="0 0 24 24" {...common}><path d="M21 12a8 8 0 0 1-8 8H6l-3 3v-8a8 8 0 1 1 18-3z" /></svg>;
  }
}

export function HomePlatformDetailsSection({
  title,
  subtitle,
  backgroundColor,
  items,
}: {
  title: string;
  subtitle: string | null;
  backgroundColor?: string | null;
  items: PlatformDetailsItem[];
}) {
  return (
    <section
      className="border-y border-[var(--color-border)] px-4 py-14 sm:px-6"
      style={{ backgroundColor: backgroundColor?.trim() || "var(--color-surface)" }}
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-extrabold text-[var(--color-foreground)] sm:text-4xl">
          {title}
        </h2>
        {subtitle?.trim() ? (
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--color-muted)] sm:text-base">
            {subtitle}
          </p>
        ) : null}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.id}
              className="group rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 text-center shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)]"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                {item.iconType === "upload" && item.customIconUrl ? (
                  <img src={item.customIconUrl} alt="" className="h-8 w-8 object-contain" aria-hidden />
                ) : (
                  <PresetIcon icon={item.presetIcon} />
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-[var(--color-foreground)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

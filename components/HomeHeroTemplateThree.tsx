export function HomeHeroTemplateThree({
  title,
  subtitle,
  phoneImageUrl,
  phoneBgColor,
  badge1ImageUrl,
  badge1Link,
  badge2ImageUrl,
  badge2Link,
}: {
  title: string;
  subtitle: string;
  phoneImageUrl: string | null;
  phoneBgColor: string;
  badge1ImageUrl: string | null;
  badge1Link: string | null;
  badge2ImageUrl: string | null;
  badge2Link: string | null;
}) {
  const renderBadge = (imageUrl: string | null, href: string | null, fallbackLabel: string) => {
    const content = imageUrl ? (
      <img src={imageUrl} alt={fallbackLabel} className="h-9 w-auto object-contain" />
    ) : (
      <span className="text-sm font-semibold">{fallbackLabel}</span>
    );
    if (href?.trim()) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/15 bg-black px-4 text-white transition hover:opacity-90"
        >
          {content}
        </a>
      );
    }
    return (
      <div className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/15 bg-black px-4 text-white">
        {content}
      </div>
    );
  };

  return (
    <section className="relative min-h-screen overflow-hidden border-b border-[var(--color-border)] bg-[#eef2f6] px-4 pt-14 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-6xl flex-col">
        <div className="mt-32 text-center sm:mt-36">
          <h1 className="text-4xl font-extrabold text-slate-800 sm:text-6xl">{title}</h1>
          <p className="mt-3 text-lg font-semibold text-sky-600 sm:text-2xl">{subtitle}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {renderBadge(badge1ImageUrl, badge1Link, "Google Play")}
            {renderBadge(badge2ImageUrl, badge2Link, "App Store")}
          </div>
        </div>

        <div className="relative mx-auto mt-auto h-[430px] w-full max-w-[540px] sm:h-[560px]">
          <div
            className="absolute inset-x-2 bottom-0 h-72 rounded-t-full sm:inset-x-0 sm:h-80"
            style={{ backgroundColor: phoneBgColor }}
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 flex justify-center">
            {phoneImageUrl?.trim() ? (
              <img
                src={phoneImageUrl}
                alt="صورة تطبيق المنصة"
                className="h-[400px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(15,23,42,0.35)] sm:h-[530px]"
              />
            ) : (
              <div className="mb-6 flex h-[360px] w-[195px] items-center justify-center rounded-[2rem] border-4 border-slate-300 bg-white text-xs font-semibold text-slate-500 shadow-2xl sm:h-[450px] sm:w-[235px]">
                أضف صورة الهاتف
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

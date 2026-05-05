"use client";

import Link from "next/link";
import { useStoreSplash } from "@/components/StoreSplashProvider";

export function HomeStoreSection({
  productsCount,
  sectionTitle,
  sectionDescription,
}: {
  productsCount: number;
  sectionTitle: string;
  sectionDescription: string;
}) {
  const { startStoreSplashTransition } = useStoreSplash();

  const handleStoreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    startStoreSplashTransition();
  };

  return (
    <>
      <section className="home-teachers-hero-blend border-t border-[var(--color-border)] px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
            <div className="bg-gradient-to-l from-[var(--color-primary)]/20 via-[var(--color-primary)]/10 to-transparent p-8 sm:p-10">
              <h2 className="text-3xl font-bold text-[var(--color-foreground)]">{sectionTitle}</h2>
              <p className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-7 text-[var(--color-muted)]">
                {sectionDescription}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href="/store"
                  onClick={handleStoreClick}
                  className="inline-flex items-center rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:bg-[var(--color-primary-hover)]"
                >
                  دخول متجر المنصة
                </Link>
                <span className="text-sm text-[var(--color-muted)]">عدد المنتجات المتاحة الآن: {productsCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

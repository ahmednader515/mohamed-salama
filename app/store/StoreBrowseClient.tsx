"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/types";

export function StoreBrowseClient({
  products,
  isSubscribed,
  isLoggedIn,
  purchasedProductIds,
}: {
  products: StoreProduct[];
  isSubscribed: boolean;
  isLoggedIn: boolean;
  purchasedProductIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [ownedIds, setOwnedIds] = useState<string[]>(purchasedProductIds);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.title.toLowerCase().includes(q));
  }, [products, query]);

  async function buy(productId: string) {
    setError("");
    setLoadingId(productId);
    try {
      const res = await fetch("/api/store/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "فشل الشراء");
      setOwnedIds((prev) => (prev.includes(productId) ? prev : [...prev, productId]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل الشراء");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">متجر المنصة</h1>
        <p className="mt-2 text-[var(--color-muted)]">ابحث باسم الملزمة أو الكتاب ثم اختر المنتج المناسب.</p>
        <div className="mt-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث باسم الملزمة أو الكتاب..."
            className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
          />
        </div>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <article key={p.id} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
              {p.imageUrl ? <img src={p.imageUrl} alt={p.title} className="h-44 w-full object-cover" /> : <div className="h-44 bg-[var(--color-primary)]/10" />}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{p.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm text-[var(--color-muted)]">{p.description}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {(() => {
                    const canAccess = isSubscribed || ownedIds.includes(p.id);
                    const canDownload = canAccess && !!p.pdfUrl;
                    return (
                      <>
                  {isSubscribed ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
                      مجاني ضمن اشتراكك
                    </span>
                  ) : ownedIds.includes(p.id) ? (
                    <span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-semibold text-sky-400">
                      تم الشراء بنجاح
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-[var(--color-primary)]">{Number(p.price).toFixed(2)} ج.م</span>
                  )}
                  {canDownload ? (
                    <a href={p.pdfUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-primary-hover)]">تحميل PDF</a>
                  ) : canAccess ? (
                    <span className="text-xs text-[var(--color-muted)]">الملف غير متاح حالياً</span>
                  ) : (
                    isLoggedIn ? (
                      <button
                        onClick={() => void buy(p.id)}
                        disabled={loadingId === p.id}
                        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] hover:shadow-lg disabled:opacity-60"
                      >
                        {loadingId === p.id ? "جاري الشراء..." : "شراء المنتج"}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--color-primary-hover)] hover:shadow-lg"
                      >
                        تسجيل الدخول للشراء
                      </Link>
                    )
                  )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </article>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-[var(--color-muted)]">لا توجد نتائج لهذا الاسم.</p> : null}
        </div>
      </div>
    </section>
  );
}

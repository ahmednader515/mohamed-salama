"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type SubscriptionPlanCardData = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  durationKind: string;
  price: number;
};

const TEAL = "#14b8a6";
const SURFACE = "#0b111e";

function durationLabel(kind: string): string {
  if (kind === "week") return "أسبوع";
  if (kind === "month") return "شهر";
  if (kind === "year") return "سنة";
  return kind;
}

const ADD_BALANCE_HREF = "/dashboard/add-balance";

function formatRenewalDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("ar-EG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}

export function SubscriptionPlanCard({
  plan,
  isStudent,
  isLoggedIn,
  hasActivePlatformSubscription = false,
  activePlatformSubscriptionExpiresAtIso = null,
}: {
  plan: SubscriptionPlanCardData;
  isStudent: boolean;
  isLoggedIn: boolean;
  /** للطالب: هل لديه اشتراك منصة نشط (أي باقة) */
  hasActivePlatformSubscription?: boolean;
  /** تاريخ انتهاء الاشتراك النشط (ISO) */
  activePlatformSubscriptionExpiresAtIso?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [showAddBalanceLink, setShowAddBalanceLink] = useState(false);
  /** تاريخ انتهاء الاشتراك بعد نجاح الشراء (ISO) */
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);

  const activeSubExpiryFormatted =
    hasActivePlatformSubscription && activePlatformSubscriptionExpiresAtIso
      ? formatRenewalDate(activePlatformSubscriptionExpiresAtIso)
      : null;

  async function purchase() {
    setErr("");
    setInfoMessage("");
    setShowAddBalanceLink(false);
    setSuccessExpiresAt(null);
    if (isStudent && hasActivePlatformSubscription) {
      const line = activeSubExpiryFormatted
        ? `اشتراكك في المنصة نشط حتى ${activeSubExpiryFormatted}. `
        : "لديك اشتراك منصة نشط. ";
      setInfoMessage(
        `${line}لا تحتاج لدفع مرة أخرى؛ يمكنك تجديد أو شراء باقة جديدة بعد انتهاء هذه المدة فقط.`,
      );
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/purchase", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      let data: {
        success?: boolean;
        expiresAt?: string;
        error?: string;
        insufficientBalance?: boolean;
        alreadySubscribed?: boolean;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = {};
      }
      if (!res.ok) {
        if (data.alreadySubscribed && typeof data.error === "string") {
          setInfoMessage(data.error);
        } else {
          setErr(typeof data.error === "string" ? data.error : "تعذر إتمام الشراء");
          setShowAddBalanceLink(!!data.insufficientBalance);
        }
        return;
      }
      if (typeof data.expiresAt !== "string" || !data.expiresAt.trim()) {
        setErr(
          "تم تنفيذ الطلب لكن لم يُرجع الخادم تاريخ انتهاء الاشتراك. إن خُصم من رصيدك، راجع لوحة التحكم أو أعد تحميل الصفحة.",
        );
        router.refresh();
        return;
      }
      setSuccessExpiresAt(data.expiresAt.trim());
      router.refresh();
    } catch {
      setErr("تعذر الاتصال بالخادم. تحقق من الشبكة ثم أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  const priceStr = Number(plan.price).toFixed(0);
  const loginHref = `/login?callbackUrl=${encodeURIComponent("/")}`;

  return (
    <article
      className="subscription-plan-card mx-auto flex max-w-sm flex-col overflow-hidden rounded-2xl shadow-xl ring-1 ring-white/10"
      style={{ background: SURFACE }}
      dir="rtl"
    >
      {/* منطقة الصورة */}
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        {plan.imageUrl ? (
          <img src={plan.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
        {isStudent && hasActivePlatformSubscription ? (
          <div
            className="pointer-events-none absolute left-3 top-3 z-[1] rounded-full border border-emerald-400/50 bg-emerald-600/90 px-3 py-1 text-center text-[11px] font-bold text-white shadow-md sm:text-xs"
            aria-hidden
          >
            مشترك
          </div>
        ) : null}
        <div
          className="pointer-events-none absolute right-0 top-0 z-[1] origin-top-right translate-x-1/4 -translate-y-1/4 rotate-45 bg-fuchsia-500 px-10 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-white shadow-md"
          aria-hidden
        >
          اشتراك
        </div>
      </div>

      {/* جسم الكارت — يتداخل مع الصورة */}
      <div
        className="relative z-[2] -mt-8 rounded-t-3xl border border-white/10 px-5 pb-6 pt-12 sm:px-6 sm:pt-14"
        style={{ background: SURFACE }}
      >
        <div
          className="absolute left-1/2 top-0 z-[3] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border-2 border-amber-500/50 bg-gradient-to-b from-amber-500 to-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg sm:px-8 sm:py-3 sm:text-base"
        >
          {durationLabel(plan.durationKind)}
        </div>

        <div className="flex flex-row items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h3 className="text-right text-xl font-bold leading-snug text-white">{plan.name}</h3>
            {isStudent && hasActivePlatformSubscription ? (
              <p className="text-right text-xs leading-relaxed text-emerald-300/95">
                {activeSubExpiryFormatted ? (
                  <>
                    أنت مشترك في اشتراك المنصة حتى{" "}
                    <span className="font-semibold text-emerald-100">{activeSubExpiryFormatted}</span>
                    . لا يلزم دفع هذه الباقة مرة أخرى قبل انتهاء المدة.
                  </>
                ) : (
                  <>أنت مشترك في اشتراك المنصة. لا يلزم دفع هذه الباقة مرة أخرى قبل انتهاء المدة الحالية.</>
                )}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2.5">
            {isStudent ? (
              <Link
                href="/courses"
                className="rounded-xl border-2 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/5"
                style={{ borderColor: TEAL }}
              >
                الكورسات
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="rounded-xl border-2 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/5"
                style={{ borderColor: TEAL }}
              >
                تسجيل الدخول
              </Link>
            )}
            {isStudent ? (
              <button
                type="button"
                onClick={purchase}
                disabled={loading}
                className={`min-w-[9.5rem] rounded-xl px-5 py-3.5 text-center text-sm font-bold shadow-lg transition sm:min-w-[10.5rem] sm:px-6 sm:py-4 sm:text-base ${
                  hasActivePlatformSubscription
                    ? "border border-emerald-400/40 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/55"
                    : "text-white hover:opacity-90 disabled:opacity-50"
                }`}
                style={hasActivePlatformSubscription ? undefined : { backgroundColor: TEAL }}
              >
                {loading
                  ? "جاري الشراء…"
                  : hasActivePlatformSubscription
                    ? "أنت مشترك — التفاصيل"
                    : "اشتر الآن"}
              </button>
            ) : isLoggedIn ? (
              <span className="rounded-xl bg-white/10 px-3 py-2 text-center text-[10px] text-neutral-400">
                للطلاب فقط
              </span>
            ) : (
              <Link
                href={loginHref}
                className="rounded-xl px-3 py-2 text-center text-xs font-semibold text-white shadow-md transition hover:opacity-90"
                style={{ backgroundColor: TEAL }}
              >
                اشتر كطالب
              </Link>
            )}
          </div>
        </div>

        <div className="my-4 space-y-2">
          <div className="h-px w-full opacity-80" style={{ backgroundColor: TEAL }} />
          <div className="h-px w-full bg-white/10" />
        </div>

        {plan.description?.trim() ? (
          <p className="text-right text-sm leading-relaxed text-neutral-400">{plan.description.trim()}</p>
        ) : (
          <p className="text-right text-sm text-neutral-500">وصول لجميع الكورسات المدفوعة المنشورة طوال مدة الاشتراك.</p>
        )}

        <div className="mt-6 flex flex-row items-end justify-between gap-3 border-t border-white/10 pt-4">
          <div className="space-y-1 text-right text-xs text-neutral-400">
            <p className="flex items-center justify-end gap-1.5">
              <span>وصول شامل للمدفوع</span>
              <span className="text-neutral-500" aria-hidden>
                ◷
              </span>
            </p>
            <p className="flex items-center justify-end gap-1.5">
              <span>جميع الأقسام</span>
              <span className="text-neutral-500" aria-hidden>
                ▤
              </span>
            </p>
          </div>
          <div
            className="flex shrink-0 items-stretch overflow-hidden rounded-lg text-sm font-bold shadow-md ring-1 ring-white/10"
            style={{ backgroundColor: TEAL }}
          >
            <span className="flex items-center px-2.5 py-2 text-white">ج.م</span>
            <span className="flex items-center bg-black px-3 py-2 text-white tabular-nums">{priceStr}</span>
          </div>
        </div>

        {infoMessage ? (
          <div className="mt-4 rounded-xl border border-amber-500/45 bg-amber-950/35 p-3 text-center text-sm leading-relaxed text-amber-100">
            {infoMessage}
          </div>
        ) : null}

        {successExpiresAt ? (
          <div
            className="mt-4 space-y-2 rounded-xl border border-emerald-500/45 bg-emerald-950/40 p-4 text-center"
            role="status"
          >
            <p className="text-base font-bold text-emerald-200">تم الاشتراك بنجاح</p>
            <p className="text-sm leading-relaxed text-emerald-100/95">
              موعد انتهاء اشتراكك الحالي (وبداية دورة التجديد التالية إن رغبت بالتمديد):{" "}
              <span className="block pt-1 font-semibold text-white sm:inline sm:pt-0">
                {formatRenewalDate(successExpiresAt)}
              </span>
            </p>
            <p className="text-xs leading-relaxed text-emerald-200/85">
              يمكنك الآن فتح جميع الكورسات المدفوعة المنشورة في المنصة دون شراء كل كورس على حدة حتى هذا التاريخ.
            </p>
            <Link
              href="/courses"
              className="mt-2 inline-flex items-center justify-center rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-teal-400"
            >
              الانتقال إلى الكورسات
            </Link>
          </div>
        ) : null}

        {err ? (
          <div className="mt-4 space-y-2 text-center">
            <p className="text-sm text-red-400">{err}</p>
            {showAddBalanceLink ? (
              <Link
                href={ADD_BALANCE_HREF}
                className="inline-flex items-center justify-center rounded-xl border border-teal-400/50 bg-teal-500/15 px-4 py-2.5 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/25"
              >
                إضافة رصيد في حسابك
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

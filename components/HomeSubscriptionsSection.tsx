"use client";

import { SubscriptionPlanCard, type SubscriptionPlanCardData } from "@/components/SubscriptionPlanCard";

/** قسم الصفحة الرئيسية «الاشتراكات المتاحة» — نفس سلم العناوين مثل «اختر المدرسين» */
export function HomeSubscriptionsSection({
  enabled,
  plans,
  isStudent,
  isLoggedIn,
  studentPlatformSubscription,
}: {
  enabled: boolean;
  plans: SubscriptionPlanCardData[];
  isStudent: boolean;
  isLoggedIn: boolean;
  /** اشتراك منصة نشط للطالب الحالي (إن وُجد) */
  studentPlatformSubscription?: { active: boolean; expiresAtIso: string | null } | null;
}) {
  if (!enabled) return null;

  return (
    <section
      className="home-teachers-hero-blend py-14"
      dir="rtl"
      aria-labelledby="home-subscriptions-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <h2
            id="home-subscriptions-heading"
            className="text-4xl font-bold leading-tight text-[var(--color-primary)] sm:text-5xl"
          >
            الاشتراكات المتاحة
          </h2>
          <svg
            className="mt-3 h-8 w-[17.5rem] text-[var(--color-primary)] sm:h-9 sm:w-[21rem] md:w-[26rem]"
            viewBox="0 0 200 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M4 20 Q 100 3 196 20"
              stroke="currentColor"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]">
            اشترك لفترة محددة واستمتع بكل الكورسات المدفوعة المنشورة دون شراء كل كورس على حدة
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="mt-14 text-center text-[var(--color-muted)]">
            لا توجد باقات حالياً. أضف باقات من لوحة التحكم ← إنشاء اشتراكات المنصة.
          </p>
        ) : (
          <div className="mt-14 flex flex-wrap justify-center gap-8">
            {plans.map((p) => (
              <SubscriptionPlanCard
                key={p.id}
                plan={p}
                isStudent={isStudent}
                isLoggedIn={isLoggedIn}
                hasActivePlatformSubscription={!!studentPlatformSubscription?.active}
                activePlatformSubscriptionExpiresAtIso={studentPlatformSubscription?.expiresAtIso ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

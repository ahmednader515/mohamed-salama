"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  defaultSubject: string;
  defaultAvatarUrl: string;
};

export function TeacherPublicProfileForm({ defaultSubject, defaultAvatarUrl }: Props) {
  const [subject, setSubject] = useState(defaultSubject);
  const [avatarUrl, setAvatarUrl] = useState(defaultAvatarUrl);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const router = useRouter();

  const changed = subject !== defaultSubject || avatarUrl !== defaultAvatarUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherSubject: subject.trim() || null,
        teacherAvatarUrl: avatarUrl.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "فشل التحديث");
      return;
    }
    setSuccess("تم حفظ الملف العام للمدرس");
    router.refresh();
  }

  return (
    <div className="mt-10 max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)]/60 p-6 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">الملف الظاهر للطلاب</h3>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        الاسم وكلمة المرور من النموذج أعلاه. هنا تظهر صورتك والمادة في صفحة «اختر المدرسين» بعد نشر كورس لك على الأقل.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error ? (
          <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">
            {success}
          </div>
        ) : null}
        <div>
          <label htmlFor="teacher-subject" className="block text-sm font-medium text-[var(--color-foreground)]">
            المادة أو التخصص (يظهر تحت اسمك)
          </label>
          <input
            id="teacher-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            placeholder="مثال: أستاذ الفيزياء — الثانوية العامة"
          />
        </div>
        <div>
          <span className="block text-sm font-medium text-[var(--color-foreground)]">صورة الملف الشخصي</span>
          <p className="mt-1 text-xs text-[var(--color-muted)]">ارفع صورة (تُحفظ على التخزين السحابي) كما في صورة الكورس عند إنشاء دورة.</p>
          {avatarUrl ? (
            <div className="mt-2 flex items-start gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt="معاينة صورة الملف الشخصي"
                className="h-28 w-28 rounded-full border border-[var(--color-border)] object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl("");
                  setImageUploadError("");
                }}
                className="text-sm text-red-600 hover:underline dark:text-red-400"
              >
                إزالة الصورة
              </button>
            </div>
          ) : null}
          <div className="mt-2">
            <label className="inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
              {imageUploading ? "جاري الرفع…" : "اختر صورة للرفع"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={imageUploading}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImageUploadError("");
                  setImageUploading(true);
                  try {
                    const fd = new FormData();
                    fd.set("file", f);
                    const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.url) {
                      setAvatarUrl(data.url);
                    } else {
                      const msg = data.missing?.length
                        ? `${data.error} ${data.missing.join(", ")}`
                        : (data.error || "فشل الرفع");
                      setImageUploadError(msg);
                    }
                  } catch {
                    setImageUploadError("فشل الاتصال بالخادم");
                  } finally {
                    setImageUploading(false);
                    e.target.value = "";
                  }
                }}
              />
            </label>
          </div>
          {imageUploadError ? (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{imageUploadError}</p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={loading || !changed}
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
        >
          {loading ? "جاري الحفظ…" : "حفظ الملف العام"}
        </button>
      </form>
    </div>
  );
}

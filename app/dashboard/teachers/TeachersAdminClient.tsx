"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable } from "@/lib/i18n/dashboard-table";
import { fillMessage } from "@/lib/i18n/interpolate";

export type TeacherRow = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  avatarUrl: string | null;
  phone: string | null;
  homepageOrder: number | null;
};

type ApiTeacher = {
  id: string;
  name: string;
  email: string;
  student_number?: string | null;
  teacher_subject?: string | null;
  teacher_avatar_url?: string | null;
  teacher_homepage_order?: number | null;
};

function normalizeHomepageOrder(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 4) return null;
  return Math.floor(n);
}

function slotsFromTeachers(list: TeacherRow[]): [string, string, string, string] {
  const s: [string, string, string, string] = ["", "", "", ""];
  for (const t of list) {
    if (t.homepageOrder != null && t.homepageOrder >= 1 && t.homepageOrder <= 4) {
      s[t.homepageOrder - 1] = t.id;
    }
  }
  return s;
}

function mapApiToRows(list: ApiTeacher[]): TeacherRow[] {
  return list.map((t) => ({
    id: t.id,
    name: t.name,
    email: t.email,
    subject: t.teacher_subject ?? null,
    avatarUrl: t.teacher_avatar_url ?? null,
    phone: t.student_number ?? null,
    homepageOrder: normalizeHomepageOrder(t.teacher_homepage_order),
  }));
}

export function TeachersAdminClient({
  initialEnabled,
  initialTeachers,
}: {
  initialEnabled: boolean;
  initialTeachers: TeacherRow[];
}) {
  const router = useRouter();
  const t = useT();
  const Ta = "dashboard.teachersAdmin";
  const { dir, thClass } = useDashboardTable();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [teachers, setTeachers] = useState(initialTeachers);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [subject, setSubject] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [createImageUploading, setCreateImageUploading] = useState(false);
  const [createImageError, setCreateImageError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageError, setEditImageError] = useState("");

  const [featuredSlots, setFeaturedSlots] = useState<[string, string, string, string]>(() =>
    slotsFromTeachers(initialTeachers),
  );
  const [featuredSaveLoading, setFeaturedSaveLoading] = useState(false);

  useEffect(() => {
    setFeaturedSlots(slotsFromTeachers(teachers));
  }, [teachers]);

  const reloadTeachers = useCallback(async () => {
    const listRes = await fetch("/api/dashboard/teachers", { credentials: "include" });
    if (!listRes.ok) return;
    const data = (await listRes.json()) as { teachers?: ApiTeacher[] };
    if (data.teachers) setTeachers(mapApiToRows(data.teachers));
  }, []);

  async function patchEnabled(next: boolean) {
    setError("");
    setToggleLoading(true);
    const res = await fetch("/api/dashboard/settings/teachers-enabled", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const data = await res.json().catch(() => ({}));
    setToggleLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Ta}.patchFailed`));
      return;
    }
    setEnabled(next);
    if (!next) setTeachers([]);
    setSuccess(next ? t(`${Ta}.enabledSuccess`) : t(`${Ta}.disabledSuccess`));
    router.refresh();
  }

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFormLoading(true);
    const res = await fetch("/api/dashboard/teachers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        teacherSubject: subject.trim() || null,
        teacherAvatarUrl: avatarUrl.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setFormLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Ta}.createFailed`));
      return;
    }
    setSuccess(t(`${Ta}.createSuccess`));
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSubject("");
    setAvatarUrl("");
    setCreateImageError("");
    await reloadTeachers();
    router.refresh();
  }

  function openEdit(row: TeacherRow) {
    setError("");
    setSuccess("");
    setEditingId(row.id);
    setEditName(row.name);
    setEditEmail(row.email);
    setEditPhone(row.phone ?? "");
    setEditPassword("");
    setEditSubject(row.subject ?? "");
    setEditAvatarUrl(row.avatarUrl ?? "");
    setEditImageError("");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingId(null);
    setEditPassword("");
    setEditLoading(false);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    setSuccess("");
    setEditLoading(true);
    const body: Record<string, unknown> = {
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      teacherSubject: editSubject.trim() || null,
      teacherAvatarUrl: editAvatarUrl.trim() || null,
    };
    if (editPassword.trim()) body.password = editPassword.trim();
    const res = await fetch(`/api/dashboard/teachers/${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setEditLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Ta}.updateFailed`));
      return;
    }
    setSuccess(t(`${Ta}.updateSuccess`));
    closeEdit();
    await reloadTeachers();
    router.refresh();
  }

  async function removeTeacher(teacher: TeacherRow) {
    const ok = window.confirm(fillMessage(t(`${Ta}.confirmDeleteTeacher`), { name: teacher.name }));
    if (!ok) return;
    setError("");
    setSuccess("");
    const res = await fetch(`/api/dashboard/teachers/${encodeURIComponent(teacher.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t(`${Ta}.deleteFailed`));
      return;
    }
    setSuccess(t(`${Ta}.deleteSuccess`));
    if (editingId === teacher.id) closeEdit();
    await reloadTeachers();
    router.refresh();
  }

  async function onAvatarFile(
    file: File | undefined,
    which: "create" | "edit",
  ) {
    if (!file) return;
    const setUploading = which === "create" ? setCreateImageUploading : setEditImageUploading;
    const setErr = which === "create" ? setCreateImageError : setEditImageError;
    const setUrl = which === "create" ? setAvatarUrl : setEditAvatarUrl;
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setUrl(data.url);
      else {
        const msg = data.missing?.length ? `${data.error} ${data.missing.join(", ")}` : data.error || t(`${Ta}.uploadFailed`);
        setErr(msg);
      }
    } catch {
      setErr(t(`${Ta}.connectionFailed`));
    } finally {
      setUploading(false);
    }
  }

  function onFeaturedSlotChange(index: number, newId: string) {
    setFeaturedSlots((prev) => {
      const next: [string, string, string, string] = [...prev] as [string, string, string, string];
      if (newId) {
        for (let j = 0; j < 4; j++) {
          if (j !== index && next[j] === newId) next[j] = "";
        }
      }
      next[index] = newId;
      return next;
    });
  }

  async function saveFeaturedHomepageOrder() {
    setError("");
    setSuccess("");
    setFeaturedSaveLoading(true);
    const orderedTeacherIds = featuredSlots.map((id) => id.trim()).filter(Boolean);
    const res = await fetch("/api/dashboard/teachers/homepage-featured", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedTeacherIds }),
    });
    const data = await res.json().catch(() => ({}));
    setFeaturedSaveLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : t(`${Ta}.featuredSaveFailed`));
      return;
    }
    setSuccess(t(`${Ta}.featuredSaved`));
    await reloadTeachers();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Ta}.multiTeachersTitle`)}</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t(`${Ta}.multiTeachersIntro`)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={toggleLoading || enabled}
            onClick={() => patchEnabled(true)}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {t(`${Ta}.enableFeature`)}
          </button>
          <button
            type="button"
            disabled={toggleLoading || !enabled}
            onClick={() => patchEnabled(false)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40 disabled:opacity-50"
          >
            {t(`${Ta}.disableFeature`)}
          </button>
          <span className="text-sm text-[var(--color-muted)]">
            {enabled ? t(`${Ta}.statusEnabled`) : t(`${Ta}.statusDisabled`)}
          </span>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">{success}</div>
      ) : null}

      {enabled ? (
        <>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Ta}.createTitle`)}</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">{t(`${Ta}.createIntro`)}</p>
            <form onSubmit={createTeacher} className="mt-4 grid max-w-2xl gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelName`)}</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelEmail`)}</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelPhoneOptional`)}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Ta}.phoneHintCreate`)}</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelSubjectOptional`)}</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={500}
                  placeholder={t(`${Ta}.subjectPlaceholder`)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div className="sm:col-span-2">
                <span className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.avatarOptional`)}</span>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Ta}.avatarHintCreate`)}</p>
                {avatarUrl ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full border border-[var(--color-border)] object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl("");
                        setCreateImageError("");
                      }}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      {t(`${Ta}.removePhoto`)}
                    </button>
                  </div>
                ) : null}
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
                    {createImageUploading ? t(`${Ta}.uploadPhotoBusy`) : t(`${Ta}.uploadPhotoIdle`)}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={createImageUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void onAvatarFile(f, "create");
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {createImageError ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{createImageError}</p>
                ) : null}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelPassword`)}</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {formLoading ? t(`${Ta}.submitCreateBusy`) : t(`${Ta}.submitCreateIdle`)}
                </button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-[var(--color-foreground)]">{t(`${Ta}.currentTeachers`)}</h2>

            {teachers.length > 0 ? (
              <div
                className="mb-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]"
                dir={dir}
              >
                <h3 className="text-base font-semibold text-[var(--color-foreground)]">{t(`${Ta}.featuredTitle`)}</h3>
                <p className="mt-2 text-sm text-[var(--color-muted)]">{t(`${Ta}.featuredIntro`)}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-[var(--color-foreground)]">
                        {fillMessage(t(`${Ta}.slotLabel`), { n: String(i + 1) })}
                      </label>
                      <select
                        value={featuredSlots[i]}
                        onChange={(e) => onFeaturedSlotChange(i, e.target.value)}
                        className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                      >
                        <option value="">{t(`${Ta}.slotEmpty`)}</option>
                        {teachers.map((row) => (
                          <option key={row.id} value={row.id}>
                            {row.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled={featuredSaveLoading}
                    onClick={() => void saveFeaturedHomepageOrder()}
                    className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                  >
                    {featuredSaveLoading ? t(`${Ta}.saveFeaturedBusy`) : t(`${Ta}.saveFeaturedIdle`)}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]" dir={dir}>
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <tr>
                    <th className={`px-3 py-3 ${thClass} font-medium w-16`}>{t(`${Ta}.colPhoto`)}</th>
                    <th className={`px-4 py-3 ${thClass} font-medium`}>{t(`${Ta}.colName`)}</th>
                    <th className={`px-4 py-3 ${thClass} font-medium`}>{t(`${Ta}.colEmail`)}</th>
                    <th className={`px-4 py-3 ${thClass} font-medium`}>{t(`${Ta}.colSubject`)}</th>
                    <th className={`px-4 py-3 ${thClass} font-medium`}>{t(`${Ta}.colActions`)}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-muted)]">
                        {t(`${Ta}.emptyTeachers`)}
                      </td>
                    </tr>
                  ) : (
                    teachers.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--color-border)]/60">
                        <td className="px-3 py-2">
                          {row.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-[var(--color-border)]" />
                          ) : (
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-border)]/50 text-xs text-[var(--color-muted)]">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-[var(--color-muted)]">{row.email}</td>
                        <td className="px-4 py-3 text-[var(--color-muted)]">{row.subject ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(row)}
                              className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                            >
                              {t(`${Ta}.edit`)}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeTeacher(row)}
                              className="rounded-[var(--radius-btn)] border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                            >
                              {t(`${Ta}.delete`)}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="edit-teacher-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-teacher-title" className="text-lg font-semibold text-[var(--color-foreground)]">
              {t(`${Ta}.editModalTitle`)}
            </h3>
            <form onSubmit={(e) => void submitEdit(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelName`)}</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelEmail`)}</label>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelPhoneLogin`)}</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
                <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Ta}.phoneHintEdit`)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelNewPasswordOptional`)}</label>
                <input
                  type="password"
                  minLength={6}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={t(`${Ta}.newPasswordPlaceholder`)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.labelSubjectOptional`)}</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  maxLength={500}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Ta}.avatarOptional`)}</span>
                {editAvatarUrl ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editAvatarUrl} alt="" className="h-20 w-20 rounded-full border border-[var(--color-border)] object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setEditAvatarUrl("");
                        setEditImageError("");
                      }}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      {t(`${Ta}.removePhoto`)}
                    </button>
                  </div>
                ) : null}
                <div className="mt-2">
                  <label className="inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
                    {editImageUploading ? t(`${Ta}.uploadPhotoBusy`) : t(`${Ta}.uploadPhotoIdle`)}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={editImageUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        void onAvatarFile(f, "edit");
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {editImageError ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editImageError}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {editLoading ? t(`${Ta}.saveEditBusy`) : t(`${Ta}.saveEditIdle`)}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                >
                  {t(`${Ta}.cancel`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

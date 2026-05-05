"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { fillMessage } from "@/lib/i18n/interpolate";

type ReviewRow = {
  id: string;
  text: string;
  textEn?: string | null;
  authorName: string;
  authorTitle: string | null;
  authorTitleEn?: string | null;
  avatarLetter: string | null;
  imageUrl: string | null;
  order: number;
};

export function ReviewsManage() {
  const router = useRouter();
  const t = useT();
  const Rm = "dashboard.reviewsManage";
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [form, setForm] = useState({
    text: "",
    textEn: "",
    authorName: "",
    authorTitle: "",
    authorTitleEn: "",
    avatarLetter: "",
    imageUrl: "",
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    text: "",
    textEn: "",
    authorName: "",
    authorTitle: "",
    authorTitleEn: "",
    avatarLetter: "",
    imageUrl: "",
  });
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageError, setEditImageError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/reviews");
      if (!res.ok) throw new Error(t(`${Rm}.loadFailed`));
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${Rm}.genericError`));
    } finally {
      setLoading(false);
    }
  }

  async function uploadReviewImage(file: File, onSuccess: (url: string) => void, onError: (msg: string) => void) {
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === "string" && data.url.trim()) {
        onSuccess(data.url.trim());
        return;
      }
      onError(data.error ?? t(`${Rm}.uploadFailed`));
    } catch {
      onError(t(`${Rm}.uploadConnectionFailed`));
    }
  }

  async function onAddImageFile(file: File | undefined) {
    if (!file) return;
    setImageError("");
    setImageUploading(true);
    await uploadReviewImage(
      file,
      (url) => setForm((f) => ({ ...f, imageUrl: url })),
      (msg) => setImageError(msg)
    );
    setImageUploading(false);
  }

  async function onEditImageFile(file: File | undefined) {
    if (!file) return;
    setEditImageError("");
    setEditImageUploading(true);
    await uploadReviewImage(
      file,
      (url) => setEditForm((f) => ({ ...f, imageUrl: url })),
      (msg) => setEditImageError(msg)
    );
    setEditImageUploading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.text.trim() || !form.authorName.trim()) {
      setError(t(`${Rm}.validationTextAuthor`));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: form.text.trim(),
          textEn: form.textEn.trim() || null,
          authorName: form.authorName.trim(),
          authorTitle: form.authorTitle.trim() || null,
          authorTitleEn: form.authorTitleEn.trim() || null,
          avatarLetter: form.avatarLetter.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Rm}.addFailed`));
      setForm({
        text: "",
        textEn: "",
        authorName: "",
        authorTitle: "",
        authorTitleEn: "",
        avatarLetter: "",
        imageUrl: "",
      });
      setImageError("");
      router.refresh();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${Rm}.addFailed`));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(r: ReviewRow) {
    setEditingId(r.id);
    setEditForm({
      text: r.text,
      textEn: r.textEn ?? "",
      authorName: r.authorName,
      authorTitle: r.authorTitle ?? "",
      authorTitleEn: r.authorTitleEn ?? "",
      avatarLetter: r.avatarLetter ?? "",
      imageUrl: r.imageUrl ?? "",
    });
    setEditImageError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditImageError("");
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    if (!editForm.text.trim() || !editForm.authorName.trim()) {
      setError(t(`${Rm}.validationTextAuthor`));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/reviews/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: editForm.text.trim(),
          textEn: editForm.textEn.trim() || null,
          authorName: editForm.authorName.trim(),
          authorTitle: editForm.authorTitle.trim() || null,
          authorTitleEn: editForm.authorTitleEn.trim() || null,
          avatarLetter: editForm.avatarLetter.trim() || null,
          imageUrl: editForm.imageUrl.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Rm}.updateFailed`));
      setEditingId(null);
      router.refresh();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(`${Rm}.updateFailed`));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/dashboard/reviews/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t(`${Rm}.deleteFailedReview`));
      setConfirmDelete(null);
      router.refresh();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : t(`${Rm}.deleteFailedReview`));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
        {t(`${Rm}.loading`)}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--color-foreground)]">{t(`${Rm}.addNewSectionTitle`)}</h3>
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Rm}.labelReviewText`)}</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={t(`${Rm}.placeholderReviewText`)}
              required
            />
            <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{t(`${Rm}.labelReviewTextEn`)}</label>
            <textarea
              value={form.textEn}
              onChange={(e) => setForm((f) => ({ ...f, textEn: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
              placeholder={t(`${Rm}.placeholderReviewTextEn`)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Rm}.labelAuthorName`)}</label>
              <input
                type="text"
                value={form.authorName}
                onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={t(`${Rm}.placeholderAuthorName`)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Rm}.labelAuthorTitleOptional`)}</label>
              <input
                type="text"
                value={form.authorTitle}
                onChange={(e) => setForm((f) => ({ ...f, authorTitle: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={t(`${Rm}.placeholderAuthorTitle`)}
              />
              <label className="mt-2 block text-xs font-medium text-[var(--color-muted)]">{t(`${Rm}.labelAuthorTitleEnOptional`)}</label>
              <input
                type="text"
                value={form.authorTitleEn}
                onChange={(e) => setForm((f) => ({ ...f, authorTitleEn: e.target.value }))}
                className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2"
                placeholder={t(`${Rm}.placeholderAuthorTitleEn`)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Rm}.labelAvatarOptional`)}</label>
            <input
              type="text"
              maxLength={1}
              value={form.avatarLetter}
              onChange={(e) => setForm((f) => ({ ...f, avatarLetter: e.target.value }))}
              className="mt-1 w-14 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-center text-lg"
              placeholder={t(`${Rm}.placeholderAvatarLetter`)}
            />
            <p className="mt-1 text-xs text-[var(--color-muted)]">{t(`${Rm}.avatarLetterHint`)}</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Rm}.labelReviewImageOptional`)}</label>
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-background)]">
                {imageUploading ? t(`${Rm}.uploadingPhoto`) : t(`${Rm}.uploadPhoto`)}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={imageUploading}
                  onChange={(e) => void onAddImageFile(e.target.files?.[0])}
                />
              </label>
              {form.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="text-sm text-red-600 hover:underline"
                >
                  {t(`${Rm}.deletePhoto`)}
                </button>
              ) : null}
            </div>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
              placeholder={t(`${Rm}.placeholderImageUrlPaste`)}
            />
            {imageError ? <p className="text-xs text-red-600 dark:text-red-400">{imageError}</p> : null}
            {form.imageUrl ? (
              <img
                src={form.imageUrl}
                alt={t(`${Rm}.imageAltPreview`)}
                className="h-36 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] object-contain p-2 sm:w-72"
              />
            ) : null}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {saving ? t(`${Rm}.saving`) : t(`${Rm}.saveNew`)}
          </button>
        </form>
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        <h3 className="border-b border-[var(--color-border)] bg-[var(--color-background)]/50 px-4 py-3 text-lg font-semibold text-[var(--color-foreground)]">
          {fillMessage(t(`${Rm}.listTitleCount`), { count: String(reviews.length) })}
        </h3>
        {reviews.length === 0 ? (
          <p className="p-8 text-center text-[var(--color-muted)]">{t(`${Rm}.emptyListHint`)}</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {reviews.map((r) => (
              <li key={r.id} className="p-4">
                {editingId === r.id ? (
                  <form onSubmit={handleUpdate} className="space-y-3">
                    <textarea
                      value={editForm.text}
                      onChange={(e) => setEditForm((f) => ({ ...f, text: e.target.value }))}
                      rows={2}
                      className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                      required
                    />
                    <textarea
                      value={editForm.textEn}
                      onChange={(e) => setEditForm((f) => ({ ...f, textEn: e.target.value }))}
                      rows={2}
                      placeholder={t(`${Rm}.editPlaceholderTextEn`)}
                      className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
                    />
                    <div className="flex flex-wrap gap-3">
                      <input
                        type="text"
                        value={editForm.authorName}
                        onChange={(e) => setEditForm((f) => ({ ...f, authorName: e.target.value }))}
                        placeholder={t(`${Rm}.editPlaceholderAuthor`)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                        required
                      />
                      <input
                        type="text"
                        value={editForm.authorTitle}
                        onChange={(e) => setEditForm((f) => ({ ...f, authorTitle: e.target.value }))}
                        placeholder={t(`${Rm}.editPlaceholderTitle`)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        value={editForm.authorTitleEn}
                        onChange={(e) => setEditForm((f) => ({ ...f, authorTitleEn: e.target.value }))}
                        placeholder={t(`${Rm}.editPlaceholderTitleEn`)}
                        className="rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                      />
                      <input
                        type="text"
                        maxLength={1}
                        value={editForm.avatarLetter}
                        onChange={(e) => setEditForm((f) => ({ ...f, avatarLetter: e.target.value }))}
                        placeholder={t(`${Rm}.editPlaceholderLetter`)}
                        className="w-10 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1.5 text-center text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-background)]">
                          {editImageUploading ? t(`${Rm}.uploadingPhoto`) : t(`${Rm}.imageEditUpload`)}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={editImageUploading}
                            onChange={(e) => void onEditImageFile(e.target.files?.[0])}
                          />
                        </label>
                        {editForm.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setEditForm((f) => ({ ...f, imageUrl: "" }))}
                            className="text-sm text-red-600 hover:underline"
                          >
                            {t(`${Rm}.deletePhoto`)}
                          </button>
                        ) : null}
                      </div>
                      <input
                        type="url"
                        value={editForm.imageUrl}
                        onChange={(e) => setEditForm((f) => ({ ...f, imageUrl: e.target.value }))}
                        placeholder={t(`${Rm}.editPlaceholderImageUrl`)}
                        className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1.5 text-sm"
                      />
                      {editImageError ? <p className="text-xs text-red-600 dark:text-red-400">{editImageError}</p> : null}
                      {editForm.imageUrl ? (
                        <img
                          src={editForm.imageUrl}
                          alt={t(`${Rm}.imageAltPreview`)}
                          className="h-32 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] object-contain p-2 sm:w-64"
                        />
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                        {saving ? t(`${Rm}.editSaving`) : t(`${Rm}.saveEdit`)}
                      </button>
                      <button type="button" onClick={cancelEdit} className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1.5 text-sm font-medium">
                        {t(`${Rm}.cancelEdit`)}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {r.imageUrl ? (
                      <img
                        src={r.imageUrl}
                        alt={fillMessage(t(`${Rm}.displayImageAlt`), { author: r.authorName })}
                        className="mb-3 h-40 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] object-contain p-2 sm:w-72"
                      />
                    ) : null}
                    <p className="text-[var(--color-foreground)]">{r.text}</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      {r.authorName}
                      {r.authorTitle ? ` — ${r.authorTitle}` : ""}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onClick={() => startEdit(r)} className="text-sm text-[var(--color-primary)] hover:underline">
                        {t(`${Rm}.editReview`)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId !== null}
                        className={
                          confirmDelete === r.id
                            ? "text-sm font-medium text-red-600 hover:underline"
                            : "text-sm text-red-600 hover:underline disabled:opacity-50"
                        }
                      >
                        {deletingId === r.id
                          ? t(`${Rm}.deleting`)
                          : confirmDelete === r.id
                            ? t(`${Rm}.confirmDeleteRepeat`)
                            : t(`${Rm}.deleteOnce`)}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

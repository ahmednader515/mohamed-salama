"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import { useDashboardTable } from "@/lib/i18n/dashboard-table";
import { fillMessage } from "@/lib/i18n/interpolate";

export type AdminPlanRow = {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  durationKind: "week" | "month" | "year";
  price: number;
  isActive: boolean;
};

export function SubscriptionsAdminClient({
  initialEnabled,
  initialPlans,
}: {
  initialEnabled: boolean;
  initialPlans: AdminPlanRow[];
}) {
  const router = useRouter();
  const t = useT();
  const Su = "dashboard.subscriptionsAdmin";
  const egp = t("common.egyptianPoundShort");
  const { dir, thClass } = useDashboardTable();

  function dkLabel(d: string): string {
    if (d === "week") return t(`${Su}.durationWeek`);
    if (d === "month") return t(`${Su}.durationMonth`);
    if (d === "year") return t(`${Su}.durationYear`);
    return d;
  }
  const [enabled, setEnabled] = useState(initialEnabled);
  const [plans, setPlans] = useState(initialPlans);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationKind, setDurationKind] = useState<"week" | "month" | "year">("month");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDurationKind, setEditDurationKind] = useState<"week" | "month" | "year">("month");
  const [editPrice, setEditPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageError, setEditImageError] = useState("");

  const reloadPlans = useCallback(async () => {
    const res = await fetch("/api/dashboard/subscription-plans", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { plans?: AdminPlanRow[] };
    if (data.plans) setPlans(data.plans);
  }, []);

  async function patchEnabled(next: boolean) {
    setError("");
    setToggleLoading(true);
    const res = await fetch("/api/dashboard/settings/subscriptions-enabled", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next }),
    });
    const data = await res.json().catch(() => ({}));
    setToggleLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Su}.updateFailed`));
      return;
    }
    setEnabled(next);
    setSuccess(next ? t(`${Su}.enabledHome`) : t(`${Su}.disabledHome`));
    router.refresh();
  }

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const p = parseFloat(price.replace(",", "."));
    if (Number.isNaN(p) || p < 0) {
      setError(t(`${Su}.invalidPrice`));
      return;
    }
    setFormLoading(true);
    const res = await fetch("/api/dashboard/subscription-plans", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        durationKind,
        price: p,
        imageUrl: imageUrl.trim() || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setFormLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Su}.createFailed`));
      return;
    }
    setSuccess(t(`${Su}.createSuccess`));
    setName("");
    setDescription("");
    setDurationKind("month");
    setPrice("");
    setImageUrl("");
    setImageError("");
    await reloadPlans();
    router.refresh();
  }

  function openEdit(row: AdminPlanRow) {
    setError("");
    setSuccess("");
    setEditingId(row.id);
    setEditName(row.name);
    setEditDescription(row.description ?? "");
    setEditDurationKind(row.durationKind);
    setEditPrice(String(row.price ?? 0));
    setEditImageUrl(row.imageUrl ?? "");
    setEditActive(row.isActive);
    setEditImageError("");
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setEditingId(null);
    setEditLoading(false);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setError("");
    setSuccess("");
    const p = parseFloat(editPrice.replace(",", "."));
    if (Number.isNaN(p) || p < 0) {
      setError(t(`${Su}.invalidPrice`));
      return;
    }
    setEditLoading(true);
    const res = await fetch(`/api/dashboard/subscription-plans/${encodeURIComponent(editingId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        description: editDescription.trim(),
        durationKind: editDurationKind,
        price: p,
        imageUrl: editImageUrl.trim() || null,
        isActive: editActive,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setEditLoading(false);
    if (!res.ok) {
      setError(data.error ?? t(`${Su}.updatePlanFailed`));
      return;
    }
    setSuccess(t(`${Su}.updatePlanSuccess`));
    closeEdit();
    await reloadPlans();
    router.refresh();
  }

  async function removePlan(row: AdminPlanRow) {
    const ok = window.confirm(fillMessage(t(`${Su}.confirmDeletePlan`), { name: row.name }));
    if (!ok) return;
    setError("");
    setSuccess("");
    const res = await fetch(`/api/dashboard/subscription-plans/${encodeURIComponent(row.id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t(`${Su}.deleteFailed`));
      return;
    }
    setSuccess(t(`${Su}.deleteSuccess`));
    if (editingId === row.id) closeEdit();
    await reloadPlans();
    router.refresh();
  }

  async function toggleRowActive(row: AdminPlanRow, next: boolean) {
    setError("");
    const res = await fetch(`/api/dashboard/subscription-plans/${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? t(`${Su}.toggleFailed`));
      return;
    }
    await reloadPlans();
    router.refresh();
  }

  async function onImageFile(file: File | undefined, which: "create" | "edit") {
    if (!file) return;
    const setUploading = which === "create" ? setImageUploading : setEditImageUploading;
    const setErr = which === "create" ? setImageError : setEditImageError;
    const setUrl = which === "create" ? setImageUrl : setEditImageUrl;
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) setUrl(data.url);
      else {
        const msg = data.missing?.length ? `${data.error} ${data.missing.join(", ")}` : data.error || t(`${Su}.uploadFailed`);
        setErr(msg);
      }
    } catch {
      setErr(t(`${Su}.connectionFailed`));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8" dir={dir}>
      <div>
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">{t(`${Su}.pageTitle`)}</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t(`${Su}.pageIntro`)}</p>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Su}.visibilityTitle`)}</h3>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{t(`${Su}.visibilityIntro`)}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={toggleLoading || enabled}
            onClick={() => void patchEnabled(true)}
            className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {t(`${Su}.enableFeature`)}
          </button>
          <button
            type="button"
            disabled={toggleLoading || !enabled}
            onClick={() => void patchEnabled(false)}
            className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40 disabled:opacity-50"
          >
            {t(`${Su}.disableFeature`)}
          </button>
          <span className="text-sm text-[var(--color-muted)]">{enabled ? t(`${Su}.statusOn`) : t(`${Su}.statusOff`)}</span>
        </div>
      </div>

      {error ? (
        <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-[var(--radius-btn)] bg-[var(--color-primary)]/10 px-3 py-2 text-sm text-[var(--color-primary)]">{success}</div>
      ) : null}

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Su}.addPlanTitle`)}</h3>
        <form onSubmit={(e) => void createPlan(e)} className="mt-4 grid max-w-2xl gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelName`)}</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelDuration`)}</label>
            <select
              value={durationKind}
              onChange={(e) => setDurationKind(e.target.value as "week" | "month" | "year")}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            >
              <option value="week">{t(`${Su}.durationWeek`)}</option>
              <option value="month">{t(`${Su}.durationMonth`)}</option>
              <option value="year">{t(`${Su}.durationYear`)}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelPrice`)}</label>
            <input
              required
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelDescription`)}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
            />
          </div>
          <div>
            <span className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.packageImageOptional`)}</span>
            {imageUrl ? (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="" className="h-24 max-w-xs rounded-lg border border-[var(--color-border)] object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageError("");
                  }}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  {t(`${Su}.removeImage`)}
                </button>
              </div>
            ) : null}
            <label className="mt-2 inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
              {imageUploading ? t(`${Su}.uploadImageBusy`) : t(`${Su}.uploadImageIdle`)}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={imageUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  void onImageFile(f, "create");
                  e.target.value = "";
                }}
              />
            </label>
            {imageError ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{imageError}</p> : null}
          </div>
          <button
            type="submit"
            disabled={formLoading}
            className="w-fit rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {formLoading ? t(`${Su}.savePlanBusy`) : t(`${Su}.savePlanIdle`)}
          </button>
        </form>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)]">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{t(`${Su}.currentPlansTitle`)}</h3>
        <div className="mt-4 overflow-x-auto" dir={dir}>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted)]">
                <th className={thClass}>{t(`${Su}.colImage`)}</th>
                <th className={thClass}>{t(`${Su}.colName`)}</th>
                <th className={thClass}>{t(`${Su}.colDuration`)}</th>
                <th className={thClass}>{t(`${Su}.colPrice`)}</th>
                <th className={thClass}>{t(`${Su}.colActive`)}</th>
                <th className={thClass}>{t(`${Su}.colActions`)}</th>
              </tr>
            </thead>
            <tbody>
              {plans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-muted)]">
                    {t(`${Su}.emptyPlans`)}
                  </td>
                </tr>
              ) : (
                plans.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--color-border)]/60">
                    <td className="px-3 py-2">
                      {row.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.imageUrl} alt="" className="h-10 w-14 rounded object-cover ring-1 ring-[var(--color-border)]" />
                      ) : (
                        <span className="text-[var(--color-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">{dkLabel(row.durationKind)}</td>
                    <td className="px-3 py-2 tabular-nums">{Number(row.price).toFixed(2)} {egp}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void toggleRowActive(row, !row.isActive)}
                        className="text-xs text-[var(--color-primary)] underline"
                      >
                        {row.isActive ? t(`${Su}.toggleHide`) : t(`${Su}.toggleShow`)}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                        >
                          {t(`${Su}.edit`)}
                        </button>
                        <button
                          type="button"
                          onClick={() => void removePlan(row)}
                          className="rounded-[var(--radius-btn)] border border-red-500/40 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
                        >
                          {t(`${Su}.delete`)}
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

      {editOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal
          aria-labelledby="edit-plan-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-plan-title" className="text-lg font-semibold text-[var(--color-foreground)]">
              {t(`${Su}.editPlanTitle`)}
            </h3>
            <form onSubmit={(e) => void submitEdit(e)} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelName`)}</label>
                <input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelDuration`)}</label>
                <select
                  value={editDurationKind}
                  onChange={(e) => setEditDurationKind(e.target.value as "week" | "month" | "year")}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                >
                  <option value="week">{t(`${Su}.durationWeek`)}</option>
                  <option value="month">{t(`${Su}.durationMonth`)}</option>
                  <option value="year">{t(`${Su}.durationYear`)}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelPriceShort`)}</label>
                <input
                  required
                  type="text"
                  inputMode="decimal"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="edit-plan-active"
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
                <label htmlFor="edit-plan-active" className="text-sm text-[var(--color-foreground)]">
                  {t(`${Su}.activeCheckbox`)}
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.labelDescEdit`)}</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-[var(--color-foreground)]">{t(`${Su}.packageImageOptional`)}</span>
                {editImageUrl ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editImageUrl} alt="" className="h-24 max-w-xs rounded-lg border border-[var(--color-border)] object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setEditImageUrl("");
                        setEditImageError("");
                      }}
                      className="text-sm text-red-600 hover:underline dark:text-red-400"
                    >
                      {t(`${Su}.removeImage`)}
                    </button>
                  </div>
                ) : null}
                <label className="mt-2 inline-flex cursor-pointer rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium transition hover:bg-[var(--color-border)]/50">
                  {editImageUploading ? t(`${Su}.uploadImageEditBusy`) : t(`${Su}.uploadImageEditIdle`)}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={editImageUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      void onImageFile(f, "edit");
                      e.target.value = "";
                    }}
                  />
                </label>
                {editImageError ? <p className="mt-1 text-sm text-red-600 dark:text-red-400">{editImageError}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  {editLoading ? t(`${Su}.saveBusy`) : t(`${Su}.saveIdle`)}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-[var(--radius-btn)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-border)]/40"
                >
                  {t(`${Su}.cancel`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

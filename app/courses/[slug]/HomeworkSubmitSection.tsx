"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Submission = {
  id: string;
  submission_type: string;
  link_url: string | null;
  file_url: string | null;
  file_name: string | null;
  created_at: string;
};

export function HomeworkSubmitSection({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState<"link" | "pdf" | "image">("link");
  const [linkUrl, setLinkUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUploading, setFileUploading] = useState(false);

  useEffect(() => {
    fetch(`/api/homework?courseId=${encodeURIComponent(courseId)}`)
      .then((r) => r.json())
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [courseId]);

  async function handleSubmitLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const url = linkUrl.trim();
    if (!url || !url.startsWith("http")) {
      setError("أدخل رابطاً صالحاً يبدأ بـ http");
      return;
    }
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/homework/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, type: "link", linkUrl: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "فشل التسليم");
        return;
      }
      setSuccess("تم تسليم الرابط بنجاح");
      setLinkUrl("");
      router.refresh();
      setSubmissions((prev) => [
        { id: "", submission_type: "link", link_url: url, file_url: null, file_name: null, created_at: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      setError("حدث خطأ");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, type: "pdf" | "image") {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setFileUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/homework", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "فشل الرفع");
        return;
      }
      setFileUrl(data.url ?? "");
      setFileName(data.fileName ?? file.name);
      setMode(type);
    } catch {
      setError("فشل الرفع");
    } finally {
      setFileUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmitFile(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!fileUrl.trim()) {
      setError("ارفع ملفاً أولاً ثم اضغط تسليم");
      return;
    }
    const type = mode;
    setSubmitLoading(true);
    try {
      const res = await fetch("/api/homework/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, type, fileUrl: fileUrl.trim(), fileName: fileName.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "فشل التسليم");
        return;
      }
      setSuccess("تم تسليم الملف بنجاح");
      setFileUrl("");
      setFileName("");
      router.refresh();
      setSubmissions((prev) => [
        { id: "", submission_type: type, link_url: null, file_url: fileUrl, file_name: fileName || null, created_at: new Date().toISOString() },
        ...prev,
      ]);
    } catch {
      setError("حدث خطأ");
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
        تسليم الواجب
      </h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        يمكنك إرسال رابط أو ملف PDF أو صورة كواجب لهذه الدورة.
      </p>
      {error && (
        <div className="mt-3 rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-[var(--radius-btn)] bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
          {success}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode("link")}
          className={`rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium ${mode === "link" ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-background)]"}`}
        >
          رابط
        </button>
        <button
          type="button"
          onClick={() => setMode("pdf")}
          className={`rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium ${mode === "pdf" ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-background)]"}`}
        >
          ملف PDF
        </button>
        <button
          type="button"
          onClick={() => setMode("image")}
          className={`rounded-[var(--radius-btn)] px-3 py-2 text-sm font-medium ${mode === "image" ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-[var(--color-background)]"}`}
        >
          صورة
        </button>
      </div>

      {mode === "link" && (
        <form onSubmit={handleSubmitLink} className="mt-4">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)]"
          />
          <button type="submit" disabled={submitLoading} className="mt-2 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
            {submitLoading ? "جاري التسليم..." : "تسليم الرابط"}
          </button>
        </form>
      )}

      {(mode === "pdf" || mode === "image") && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--color-foreground)]">
            {mode === "pdf" ? "رفع ملف PDF" : "رفع صورة"}
          </label>
          <input
            type="file"
            accept={mode === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp,image/gif"}
            onChange={(e) => handleFileSelect(e, mode)}
            disabled={fileUploading}
            className="mt-1 block w-full text-sm text-[var(--color-muted)] file:mr-2 file:rounded-[var(--radius-btn)] file:border-0 file:bg-[var(--color-primary)] file:px-3 file:py-1.5 file:text-white"
          />
          {fileUrl && (
            <form onSubmit={handleSubmitFile} className="mt-2">
              <p className="text-sm text-[var(--color-muted)]">{fileName || "تم اختيار الملف"}</p>
              <button type="submit" disabled={submitLoading} className="mt-2 rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {submitLoading ? "جاري التسليم..." : "تسليم الملف"}
              </button>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-[var(--color-muted)]">جاري التحميل...</p>
      ) : submissions.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-[var(--color-foreground)]">تسليماتك السابقة</h3>
          <ul className="mt-2 space-y-2">
            {submissions.map((s, i) => (
              <li key={s.id || i} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm">
                {s.submission_type === "link" && s.link_url ? (
                  <a href={s.link_url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                    {s.link_url}
                  </a>
                ) : (s.file_url || s.link_url) ? (
                  <a href={s.file_url || s.link_url || "#"} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
                    {s.file_name || "ملف مرفوع"}
                  </a>
                ) : null}
                <span className="text-[var(--color-muted)]">
                  {new Date(s.created_at).toLocaleDateString("ar-EG")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

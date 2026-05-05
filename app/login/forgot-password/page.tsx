"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/components/LocaleProvider";

export default function ForgotPasswordPage() {
  const t = useT();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOrPhone: emailOrPhone.trim(),
          oldPassword: oldPassword || undefined,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? t("auth.forgot.sendFailed", "Failed to send request"));
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t("auth.forgot.connectionError", "Connection error occurred"));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            {t("auth.forgot.sentTitle", "Request sent")}
          </h1>
          <div className="mt-4 rounded-[var(--radius-btn)] border border-green-200 bg-green-50/50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
            {t("auth.forgot.sentDescription", "Your password-change request has been sent to admin. Your data will be updated within hours. Thanks for your patience.")}
          </div>
          <Link
            href="/login"
            className="mt-6 block w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2.5 text-center font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            {t("auth.forgot.backToLogin", "Back to login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          {t("auth.forgot.title", "Forgot password / Request account update")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("auth.forgot.subtitle", "Enter your registered email or phone and your new password. The request will be sent to admin and handled within hours.")}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="emailOrPhone" className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("auth.forgot.emailOrPhoneLabel", "Email or phone number")}
            </label>
            <input
              id="emailOrPhone"
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              placeholder={t("auth.forgot.emailOrPhonePlaceholder", "example@email.com or 01xxxxxxxxx")}
            />
          </div>
          <div>
            <label htmlFor="oldPassword" className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("auth.forgot.oldPasswordLabel", "Current password (optional if remembered)")}
            </label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              placeholder={t("auth.forgot.oldPasswordPlaceholder", "Shown to admin if provided")}
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--color-foreground)]">
              {t("auth.forgot.newPasswordLabel", "New password")}
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              placeholder={t("auth.forgot.newPasswordPlaceholder", "At least 6 characters")}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2.5 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {loading ? t("auth.forgot.submitting", "Sending...") : t("auth.forgot.submit", "Send request")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            ← {t("auth.forgot.backToLogin", "Back to login")}
          </Link>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CONCURRENT_SESSION_ERROR } from "@/lib/auth-constants";
import LoginBackground from "./LoginBackground";
import { useT } from "@/components/LocaleProvider";

function LoginForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [concurrentSession, setConcurrentSession] = useState(false);
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const reasonElsewhere = searchParams.get("reason") === "session_ended_elsewhere";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConcurrentSession(false);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error === CONCURRENT_SESSION_ERROR) {
        setConcurrentSession(true);
        setLoading(false);
        return;
      }
      if (res?.error) {
        setError(t("auth.login.invalidCredentials", "Email/phone or password is incorrect"));
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleForceLogoutOther(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setForceLogoutLoading(true);
    try {
      const r = await fetch("/api/auth/force-logout-other", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? t("auth.login.forceLogoutFailed", "Failed to log out the other device"));
        return;
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(t("auth.login.loginAfterForceLogoutFailed", "Failed to log in after logging out the other device"));
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setForceLogoutLoading(false);
    }
  }

  if (concurrentSession) {
    return (
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-none flex-col overflow-hidden bg-black">
        <LoginBackground />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/55" />
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-800 dark:bg-amber-900/20 sm:p-8">
          <h1 className="text-xl font-bold text-amber-800 dark:text-amber-200">
            {t("auth.login.concurrentTitle", "This account is active on another device")}
          </h1>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            {t("auth.login.concurrentDescription", "This account is currently logged in from another device or browser. To continue here, log out the other device first.")}
          </p>
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            {t("auth.login.concurrentSecurityHint", "If you suspect your account was compromised, update your password and account details from \"Edit account\" after logging in.")}
          </p>
          {error && (
            <div className="mt-4 rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleForceLogoutOther} className="mt-6">
            <button
              type="submit"
              disabled={forceLogoutLoading}
              className="w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2.5 font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
            >
              {forceLogoutLoading
                ? t("auth.login.concurrentActionLoading", "Processing...")
                : t("auth.login.concurrentAction", "Log out the other device and continue here")}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setConcurrentSession(false)}
            className="mt-4 w-full text-sm text-[var(--color-muted)] hover:underline"
          >
            {t("auth.login.concurrentCancel", "Cancel and go back to login")}
          </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-none flex-col overflow-hidden bg-black">
      <LoginBackground />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-black/55" />
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
          {t("auth.login.title", "Log in")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {t("auth.login.subtitle", "Enter your details to access your account")}
        </p>
        {reasonElsewhere && (
          <div className="mt-4 rounded-[var(--radius-btn)] border border-amber-200 bg-amber-50/50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {t("auth.login.sessionEndedElsewhere", "You were logged out because this account was opened on another device. Log in again here if you want.")}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-[var(--radius-btn)] bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-foreground)]"
            >
              {t("auth.login.emailOrPhoneLabel", "Email or phone number")}
            </label>
            <input
              id="email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              placeholder={t("auth.login.emailOrPhonePlaceholder", "example@email.com or 01xxxxxxxxx")}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-foreground)]"
            >
              {t("auth.login.passwordLabel", "Password")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-[var(--radius-btn)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-[var(--color-foreground)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <p className="mt-1.5 text-xs text-[var(--color-muted)]">
              <Link href="/login/forgot-password" className="text-[var(--color-primary)] hover:underline">
                {t("auth.login.forgotPassword", "Forgot password?")}
              </Link>
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-btn)] bg-[var(--color-primary)] py-2.5 font-medium text-white transition hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
          >
            {loading ? t("auth.login.submitting", "Logging in...") : t("auth.login.submit", "Log in")}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
          {t("auth.login.noAccount", "Don't have an account?")}{" "}
          <Link
            href="/register"
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            {t("auth.login.createAccount", "Create account")}
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-none flex-col overflow-hidden bg-black">
        <LoginBackground />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-black/55" />
        <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8">
            <div className="h-8 w-48 animate-pulse rounded bg-[var(--color-border)]" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--color-border)]" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-[var(--color-border)]" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

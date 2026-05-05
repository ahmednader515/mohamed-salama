import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getLiveStreamsAll, getLiveStreamsForTeacher } from "@/lib/db";
import { getServerTranslator } from "@/lib/i18n/server";
import { LiveStreamsList } from "./LiveStreamsList";

export default async function DashboardLiveStreamsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    redirect("/dashboard");
  }
  const t = await getServerTranslator();
  const P = "dashboard.liveStreamsPage";

  let streams: Awaited<ReturnType<typeof getLiveStreamsAll>>;
  try {
    streams =
      role === "TEACHER"
        ? await getLiveStreamsForTeacher(session.user.id)
        : await getLiveStreamsAll();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("LiveStream") && msg.includes("does not exist")) {
      return (
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-[var(--color-foreground)]">
              {t(`${P}.title`)}
            </h2>
          </div>
          <div className="rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-900/20">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              {t(`${P}.dbMissingTitle`)}
            </h3>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {t(`${P}.dbMissingHint`)}
            </p>
            <pre className="mt-4 overflow-x-auto rounded bg-black/10 p-4 text-left text-xs">
{`CREATE TABLE IF NOT EXISTS "LiveStream" (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  title_ar          TEXT,
  provider          TEXT NOT NULL CHECK (provider IN ('zoom', 'google_meet')),
  meeting_url       TEXT NOT NULL,
  meeting_id        TEXT,
  meeting_password  TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  description       TEXT,
  "order"           INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "LiveStream_course_id_idx" ON "LiveStream"(course_id);
CREATE INDEX IF NOT EXISTS "LiveStream_scheduled_at_idx" ON "LiveStream"(scheduled_at);`}
            </pre>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              {t(`${P}.dbMissingRefresh`)}
            </p>
          </div>
        </div>
      );
    }
    throw err;
  }

  const list = streams.map((s) => {
    const row = s as unknown as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      title: String(row.title ?? ""),
      titleAr: String(row.titleAr ?? row.title_ar ?? ""),
      provider: String(row.provider ?? ""),
      meetingUrl: String(row.meetingUrl ?? row.meeting_url ?? ""),
      scheduledAt: row.scheduledAt ?? row.scheduled_at,
      course: row.course as { id: string; title: string; slug: string } | undefined,
    };
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-[var(--color-foreground)]">
          {t(`${P}.title`)}
        </h2>
        <Link
          href="/dashboard/live-streams/new"
          className="rounded-[var(--radius-btn)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
        >
          {t(`${P}.addStream`)}
        </Link>
      </div>
      <LiveStreamsList streams={list} />
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getLiveStreamById, getCoursesAll, getCoursesWithCountsForCreator, getCourseById } from "@/lib/db";
import { canManageCourse } from "@/lib/permissions";
import { LiveStreamForm } from "../../LiveStreamForm";

type Props = { params: Promise<{ id: string }> };

function toDateTimeLocal(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default async function EditLiveStreamPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const stream = await getLiveStreamById(id);
  if (!stream) notFound();

  const s = stream as unknown as Record<string, unknown>;
  const streamCourseId = String(s.courseId ?? s.course_id ?? "");
  const courseForPerm = await getCourseById(streamCourseId);
  const createdBy =
    (courseForPerm as { createdById?: string | null; created_by_id?: string | null } | null)?.createdById ??
    (courseForPerm as { created_by_id?: string | null } | null)?.created_by_id ??
    null;
  if (!canManageCourse(role, session.user.id, createdBy)) {
    redirect("/dashboard");
  }

  const courses =
    role === "TEACHER"
      ? await getCoursesWithCountsForCreator(session.user.id).then((rows) =>
          rows.map((r) => {
            const row = r as Record<string, unknown>;
            return {
              id: String(row.id ?? ""),
              title: String(row.title ?? ""),
              title_ar: String(row.titleAr ?? row.title_ar ?? row.title ?? ""),
            };
          }),
        )
      : await getCoursesAll();

  const initialData = {
    id: String(s.id),
    courseId: streamCourseId,
    title: String(s.title ?? ""),
    titleAr: String(s.title_ar ?? s.titleAr ?? ""),
    provider: (s.provider === "google_meet" ? "google_meet" : "zoom") as "zoom" | "google_meet",
    meetingUrl: String(s.meeting_url ?? ""),
    meetingId: String(s.meeting_id ?? s.meetingId ?? ""),
    meetingPassword: String(s.meeting_password ?? s.meetingPassword ?? ""),
    scheduledAt: toDateTimeLocal((s.scheduled_at ?? s.scheduledAt) as Date | string),
    description: String(s.description ?? ""),
    order: Number(s.order ?? 0),
  };

  const courseOptions = courses.map((c) => ({
    id: c.id,
    title: (c as { title_ar?: string; title: string }).title_ar ?? c.title,
  }));

  return (
    <div>
      <Link
        href="/dashboard/live-streams"
        className="text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        ← العودة إلى البثوث المباشرة
      </Link>
      <h2 className="mt-4 text-xl font-bold text-[var(--color-foreground)]">
        تعديل البث المباشر
      </h2>
      <LiveStreamForm courseOptions={courseOptions} initialData={initialData} />
    </div>
  );
}

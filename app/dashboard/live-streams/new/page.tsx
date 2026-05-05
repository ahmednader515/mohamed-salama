import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCoursesAll, getCoursesWithCountsForCreator } from "@/lib/db";
import { LiveStreamForm } from "../LiveStreamForm";

export default async function NewLiveStreamPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "ASSISTANT_ADMIN" && role !== "TEACHER") {
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
              slug: String(row.slug ?? ""),
            };
          }),
        )
      : await getCoursesAll();
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
        إضافة بث مباشر
      </h2>
      <LiveStreamForm courseOptions={courseOptions} />
    </div>
  );
}

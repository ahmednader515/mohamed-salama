import { redirect } from "next/navigation";
import { unstable_noStore } from "next/cache";
import { getTeachersFeatureEnabled, listTeachersForHomepage } from "@/lib/db";
import { TeachersBrowseClient } from "./TeachersBrowseClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "اختر المدرسين | منصتي التعليمية",
  description: "تصفح مدرسي المنصة والدورات المتاحة لكل مدرس",
};

export default async function TeachersPage() {
  unstable_noStore();
  const enabled = await getTeachersFeatureEnabled();
  if (!enabled) {
    redirect("/");
  }
  const teachers = await listTeachersForHomepage().catch(() => []);

  return <TeachersBrowseClient initialTeachers={teachers} />;
}

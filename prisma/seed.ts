/**
 * بذرة البيانات — تستخدم اتصال Neon مباشرة (بدون Prisma).
 * تشغيل: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
 * أو: node --loader ts-node/esm prisma/seed.ts
 */
import "dotenv/config";
import { hash } from "bcryptjs";
import {
  getUserByEmail,
  createUser,
  getCategories,
  createCategory,
  createCourse,
  createLesson,
} from "../lib/db";

async function main() {
  const adminPassword = await hash("admin123", 12);
  const assistantPassword = await hash("assistant123", 12);

  if (!(await getUserByEmail("admin@example.com"))) {
    await createUser({
      email: "admin@example.com",
      password_hash: adminPassword,
      name: "مدير المنصة",
      role: "ADMIN",
    });
    console.log("Created admin user");
  }

  if (!(await getUserByEmail("assistant@example.com"))) {
    await createUser({
      email: "assistant@example.com",
      password_hash: assistantPassword,
      name: "مساعد المدير",
      role: "ASSISTANT_ADMIN",
    });
    console.log("Created assistant user");
  }

  const categories = await getCategories();
  const hasProgramming = categories.some((c: { slug?: string }) => c.slug === "programming");
  const hasDesign = categories.some((c: { slug?: string }) => c.slug === "design");

  let cat1 = categories.find((c: { slug?: string }) => c.slug === "programming");
  if (!cat1 && !hasProgramming) {
    cat1 = await createCategory({
      name: "Programming",
      name_ar: "البرمجة",
      slug: "programming",
      description: "دورات البرمجة وتطوير البرمجيات",
      order: 1,
    });
    console.log("Created category programming");
  }

  if (!hasDesign) {
    await createCategory({
      name: "Design",
      name_ar: "التصميم",
      slug: "design",
      description: "التصميم الجرافيكي والواجهات",
      order: 2,
    });
    console.log("Created category design");
  }

  const course = await createCourse({
    title: "Next.js من الصفر",
    title_ar: "Next.js من الصفر",
    slug: "nextjs-basics",
    description:
      "تعلم بناء تطبيقات ويب حديثة باستخدام Next.js و React. نغطي التوجيه، جلب البيانات، والـ API Routes.",
    short_desc: "تعلم Next.js و React خطوة بخطوة",
    price: 0,
    is_published: true,
    created_by_id: (await getUserByEmail("admin@example.com"))!.id,
  });

  await createLesson({
    course_id: course.id,
    title: "مقدمة إلى Next.js",
    title_ar: "مقدمة إلى Next.js",
    slug: "intro-nextjs",
    content: "نظرة عامة على الإطار وكيفية إعداد المشروع.",
    order: 1,
  });
  await createLesson({
    course_id: course.id,
    title: "التوجيه (Routing)",
    title_ar: "التوجيه",
    slug: "routing",
    content: "App Router وملفات التوجيه الديناميكي.",
    order: 2,
  });

  console.log("Seed completed.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

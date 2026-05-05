import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * فحص حالة النشر على Vercel:
 * افتح في المتصفح: https://your-app.vercel.app/api/health
 * إذا ظهرت أخطاء، أضف المتغيرات المطلوبة في Vercel → Settings → Environment Variables ثم أعد النشر.
 */
export async function GET() {
  const hasDbUrl = !!process.env.DATABASE_URL?.trim();
  const hasAuthSecret = !!process.env.NEXTAUTH_SECRET?.trim();
  const hasAuthUrl = !!process.env.NEXTAUTH_URL?.trim();

  let dbStatus: "ok" | "missing_url" | "error" = hasDbUrl ? "ok" : "missing_url";
  let dbMessage = "";

  if (hasDbUrl) {
    try {
      await sql`SELECT 1`;
      dbMessage = "متصل";
    } catch (e) {
      dbStatus = "error";
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Can't reach") || msg.includes("ECONNREFUSED") || msg.includes("connection")) {
        dbMessage = "لا يمكن الوصول لقاعدة البيانات. تأكد أن DATABASE_URL يشير إلى قاعدة سحابية (Neon/Supabase) وليس localhost.";
      } else if (msg.includes("Authentication failed") || msg.includes("password")) {
        dbMessage = "فشل الاتصال: تحقق من صحة اسم المستخدم وكلمة المرور في DATABASE_URL.";
      } else {
        dbMessage = "خطأ في الاتصال. تحقق من DATABASE_URL وأعد النشر.";
      }
    }
  } else {
    dbMessage = "Environment variable not found: DATABASE_URL. في Vercel: Settings → Environment Variables → أضف Key: DATABASE_URL وقيمة رابط PostgreSQL (Neon/Supabase) ثم Redeploy. راجع ENV_VERCEL.md.";
  }

  const authOk = hasAuthSecret && hasAuthUrl;
  const authMessages: string[] = [];
  if (!hasAuthSecret) authMessages.push("NEXTAUTH_SECRET غير معيّن.");
  if (!hasAuthUrl) authMessages.push("NEXTAUTH_URL غير معيّن (يجب أن يكون عنوان موقعك، مثل https://your-app.vercel.app).");

  const ok = dbStatus === "ok" && authOk;

  return NextResponse.json({
    ok,
    message: ok
      ? "كل شيء مضبوط. قاعدة البيانات والجلسات تعمل."
      : "يوجد خلل في الإعداد. راجع التفاصيل أدناه.",
    database: {
      status: dbStatus,
      message: dbMessage,
    },
    auth: {
      ready: authOk,
      messages: authMessages.length ? authMessages : ["مضبوط"],
    },
    hint: !ok
      ? "في Vercel: Project → Settings → Environment Variables. أضف DATABASE_URL (رابط Neon/Supabase)، NEXTAUTH_SECRET، NEXTAUTH_URL ثم Redeploy."
      : undefined,
  });
}

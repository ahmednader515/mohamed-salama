-- إضافة عمود الجلسة النشطة للمستخدم (جلسة واحدة لكل حساب — منع تسجيل الدخول من أكثر من جهاز)
-- شغّله من لوحة Neon → SQL Editor

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS current_session_id TEXT;

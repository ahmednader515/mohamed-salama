-- إضافة وقت الاختبار بالدقائق (اختياري) لجدول الاختبارات.
-- شغّل من لوحة Neon (SQL Editor) إذا كان لديك قاعدة بيانات قديمة أنشئت قبل هذه الميزة.
ALTER TABLE "Quiz" ADD COLUMN IF NOT EXISTS time_limit_minutes INT;

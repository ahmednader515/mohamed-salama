-- تفعيل نظام المدرسين المتعددين على المنصة
-- نفّذ الملف من Neon SQL Editor أو: psql $DATABASE_URL -f scripts/add-teachers-multi.sql

-- 1) قيمة جديدة في enum الرتب (تجاهل إن كانت موجودة مسبقاً)
DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'TEACHER';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) حقول المدرس في جدول المستخدمين
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS teacher_subject TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS teacher_avatar_url TEXT;

-- 3) تفعيل/إيقاف الميزة من لوحة الأدمن (صف الإعدادات الافتراضي)
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS teachers_enabled BOOLEAN NOT NULL DEFAULT false;

-- تحديث الصف الافتراضي إن وُجد بدون العمود سابقاً
UPDATE "HomepageSetting" SET teachers_enabled = COALESCE(teachers_enabled, false) WHERE id = 'default';

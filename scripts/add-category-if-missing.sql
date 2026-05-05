-- ============================================================
-- تشغيل هذا الملف فقط لو قاعدة البيانات قديمة وليس فيها
-- جدول Category ولا عمود category_id في Course
-- من لوحة Neon: SQL Editor → لصق المحتوى وتشغيله
-- ============================================================

-- جدول الأقسام (إن لم يكن موجوداً)
CREATE TABLE IF NOT EXISTS "Category" (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_ar     TEXT,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  "order"     INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إضافة عمود القسم للكورسات (إن لم يكن موجوداً)
-- لو ظهر خطأ أن العمود موجود فعلاً، تجاهله
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Course' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE "Course" ADD COLUMN category_id TEXT REFERENCES "Category"(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS "Course_category_id_idx" ON "Course"(category_id);
  END IF;
END $$;

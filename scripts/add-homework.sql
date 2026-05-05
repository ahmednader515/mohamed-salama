-- استلام الواجبات: تفعيل على الكورس + جدول تسليمات الطلاب
-- تشغيله مرة واحدة من لوحة Neon: SQL Editor

-- 1) إضافة خيار "استلام الواجب" للكورس
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS accepts_homework BOOLEAN NOT NULL DEFAULT false;

-- 2) جدول تسليمات الواجبات
CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
  id            TEXT PRIMARY KEY,
  course_id     TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('link', 'pdf', 'image')),
  link_url      TEXT,
  file_url      TEXT,
  file_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "HomeworkSubmission_course_id_idx" ON "HomeworkSubmission"(course_id);
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_user_id_idx" ON "HomeworkSubmission"(user_id);
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_created_at_idx" ON "HomeworkSubmission"(created_at);

-- تشغيل هذا الملف في Neon (SQL Editor) لإنشاء جدول البث المباشر

CREATE TABLE IF NOT EXISTS "LiveStream" (
  id                TEXT PRIMARY KEY,
  course_id         TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  title_ar          TEXT,
  provider          TEXT NOT NULL CHECK (provider IN ('zoom', 'google_meet')),
  meeting_url       TEXT NOT NULL,
  meeting_id        TEXT,
  meeting_password  TEXT,
  scheduled_at      TIMESTAMPTZ NOT NULL,
  description       TEXT,
  "order"           INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LiveStream_course_id_idx" ON "LiveStream"(course_id);
CREATE INDEX IF NOT EXISTS "LiveStream_scheduled_at_idx" ON "LiveStream"(scheduled_at);

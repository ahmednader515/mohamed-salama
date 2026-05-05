-- تقييمات الدروس (كل طالب يقيم كل حصة مرة واحدة ويتم التحديث عند إعادة التقييم)
-- تشغيله مرة واحدة من لوحة قاعدة البيانات (SQL Editor)

CREATE TABLE IF NOT EXISTS "LessonRating" (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES "Lesson"(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_rating_unique_lesson_user UNIQUE (lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS "LessonRating_lesson_id_idx" ON "LessonRating"(lesson_id);
CREATE INDEX IF NOT EXISTS "LessonRating_course_id_idx" ON "LessonRating"(course_id);
CREATE INDEX IF NOT EXISTS "LessonRating_user_id_idx" ON "LessonRating"(user_id);

-- تشغيل هذا الملف على قاعدة البيانات (Neon) لإضافة دعم حد محاولات الاختبار وإحصائيات الطلاب.
-- نفّذ المحتوى من لوحة Neon (SQL Editor) أو عبر: psql $DATABASE_URL -f scripts/add-quiz-attempts.sql

-- إضافة عمود حد المحاولات للكورس (null = غير محدود)
ALTER TABLE "Course" ADD COLUMN IF NOT EXISTS max_quiz_attempts INT;

-- جدول محاولات الاختبار (للمراجعة والإحصائيات)
CREATE TABLE IF NOT EXISTS "QuizAttempt" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  quiz_id TEXT NOT NULL REFERENCES "Quiz"(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "QuizAttempt_user_quiz_idx" ON "QuizAttempt"(user_id, quiz_id);
CREATE INDEX IF NOT EXISTS "QuizAttempt_user_id_idx" ON "QuizAttempt"(user_id);

-- جدول المدفوعات (رصيد مدفوع من الطلاب للتسجيل في الكورسات — لإجمالي أرباح المنصة)
CREATE TABLE IF NOT EXISTS "Payment" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES "Course"(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "Payment_created_at_idx" ON "Payment"(created_at);

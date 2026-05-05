-- إضافة رقم الطالب ورقم ولي الأمر إلى جدول المستخدمين
-- نفّذ هذا في Neon: SQL Editor → لصق وتشغيل (مرة واحدة)

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS student_number  TEXT,
  ADD COLUMN IF NOT EXISTS guardian_number TEXT;

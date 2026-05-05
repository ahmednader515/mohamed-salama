-- إضافة جدول تعليقات الطلاب (تشغيله في Neon SQL Editor إذا الجدول غير موجود)
CREATE TABLE IF NOT EXISTS "Review" (
  id             TEXT PRIMARY KEY,
  text           TEXT NOT NULL,
  text_en        TEXT,
  author_name    TEXT NOT NULL,
  author_title   TEXT,
  author_title_en TEXT,
  avatar_letter  TEXT,
  image_url      TEXT,
  "order"        INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Review_order_idx" ON "Review"("order");
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS text_en TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS author_title_en TEXT;

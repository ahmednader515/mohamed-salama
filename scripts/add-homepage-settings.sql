-- إعدادات الصفحة الرئيسية: صورة المدرس، النصوص، روابط واتساب/فيسبوك، عنوان التبويب
-- شغّله من لوحة Neon → SQL Editor إذا الجدول غير موجود

CREATE TABLE IF NOT EXISTS "HomepageSetting" (
  id                  TEXT PRIMARY KEY DEFAULT 'default',
  teacher_image_url   TEXT,
  hero_title          TEXT,
  hero_slogan         TEXT,
  platform_name       TEXT,
  whatsapp_url        TEXT,
  facebook_url        TEXT,
  team_whatsapp_url   TEXT,
  team_facebook_url   TEXT,
  page_title          TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- إدراج الصف الافتراضي إن لم يكن موجوداً
INSERT INTO "HomepageSetting" (id, teacher_image_url, hero_title, hero_slogan, platform_name, whatsapp_url, facebook_url, team_whatsapp_url, team_facebook_url, page_title, updated_at)
VALUES (
  'default',
  '/instructor.png',
  'أستاذ / عصام محي',
  'ادرسها... يمكن تفهم المعلومة صح!',
  'منصة أستاذ عصام محي',
  'https://wa.me/966553612356',
  'https://www.facebook.com/profile.php?id=61562686209159',
  NULL,
  NULL,
  'منصتي التعليمية | دورات وتعلم أونلاين',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

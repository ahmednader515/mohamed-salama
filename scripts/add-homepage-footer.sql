-- إضافة أعمدة نصوص الفوتر (أسفل الموقع) لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا الجدول HomepageSetting موجود وبدون هذه الأعمدة

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_tagline TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_copyright TEXT;

UPDATE "HomepageSetting"
SET
  footer_title    = COALESCE(footer_title, 'منصتي التعليمية'),
  footer_tagline  = COALESCE(footer_tagline, 'تعلم بأسلوب حديث ومنهجية واضحة'),
  footer_copyright = COALESCE(footer_copyright, 'منصتي التعليمية. جميع الحقوق محفوظة.'),
  updated_at      = NOW()
WHERE id = 'default';

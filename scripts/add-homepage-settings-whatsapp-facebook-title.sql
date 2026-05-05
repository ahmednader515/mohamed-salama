-- إضافة أعمدة: روابط واتساب وفيسبوك وعنوان التبويب لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا الجدول HomepageSetting موجود مسبقاً وبدون هذه الأعمدة
-- إن استمر خطأ «عمود غير موجود» بعد الحفظ، نفّذ السكربت الكامل: scripts/ensure-homepage-setting-columns.sql
-- (لوحة الإعدادات تحدّث أعمدة إضافية مثل page_title_en وtelegram_url وغيرها).

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS page_title TEXT;

-- تعيين قيم افتراضية للصف الموجود
UPDATE "HomepageSetting"
SET
  whatsapp_url = COALESCE(whatsapp_url, 'https://wa.me/966553612356'),
  facebook_url = COALESCE(facebook_url, 'https://www.facebook.com/profile.php?id=61562686209159'),
  page_title = COALESCE(page_title, 'منصتي التعليمية | دورات وتعلم أونلاين'),
  updated_at = NOW()
WHERE id = 'default';

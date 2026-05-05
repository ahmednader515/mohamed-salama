-- إضافة عمود لون خلفية الهيرو (وراء صورة المدرس) لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا الجدول HomepageSetting موجود وبدون عمود hero_bg_preset

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_preset TEXT;

UPDATE "HomepageSetting"
SET hero_bg_preset = COALESCE(hero_bg_preset, 'navy'), updated_at = NOW()
WHERE id = 'default';

-- إضافة أعمدة تغيير التصميم العام للواجهة الرئيسية (Hero Template + Slider)
-- شغّله من لوحة Neon → SQL Editor إذا كانت الأعمدة غير موجودة

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_template TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_1 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_2 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_3 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_4 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_5 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_interval_ms INTEGER;

-- قيم افتراضية للسجل الرئيسي
UPDATE "HomepageSetting"
SET
  hero_template = COALESCE(hero_template, 'classic'),
  hero_slider_interval_ms = COALESCE(hero_slider_interval_ms, 5000),
  updated_at = NOW()
WHERE id = 'default';

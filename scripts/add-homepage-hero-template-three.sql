-- إضافة أعمدة القالب الثالث (Hero 3) في الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_bg_color TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_link TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_link TEXT;

UPDATE "HomepageSetting"
SET
  hero3_title = COALESCE(hero3_title, 'المنصة الشاملة رقم 1'),
  hero3_subtitle = COALESCE(hero3_subtitle, 'انضم لأكثر من مليون طالب مع الخطة'),
  hero3_phone_bg_color = COALESCE(hero3_phone_bg_color, '#FACC15'),
  updated_at = NOW()
WHERE id = 'default';

-- الصور الصغيرة العائمة حول صورة المدرس في الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor (بعد وجود جدول HomepageSetting)

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_1 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_2 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_3 TEXT;

UPDATE "HomepageSetting"
SET
  hero_float_image_1 = COALESCE(hero_float_image_1, '/images/ruler.png'),
  hero_float_image_2 = COALESCE(hero_float_image_2, '/images/notebook.png'),
  hero_float_image_3 = COALESCE(hero_float_image_3, '/images/pencil.png'),
  updated_at = NOW()
WHERE id = 'default';

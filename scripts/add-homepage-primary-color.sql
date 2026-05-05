-- إضافة عمود لون المنصة الأساسي (Primary Color) لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا كان العمود غير موجود

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS primary_color TEXT;

-- اتركه NULL لاستخدام اللون الافتراضي من الواجهة، أو ضع قيمة مثل '#0ea5e9'
-- مثال:
-- UPDATE "HomepageSetting" SET primary_color = '#0ea5e9', updated_at = NOW() WHERE id = 'default';


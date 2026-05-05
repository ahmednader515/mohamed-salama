-- إضافة عمود لوجو الهيدر لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا كان العمود غير موجود

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS header_logo_url TEXT;

-- اتركه NULL لإخفاء اللوجو وإظهار الاسم فقط
-- مثال:
-- UPDATE "HomepageSetting" SET header_logo_url = 'https://.../logo.png', updated_at = NOW() WHERE id = 'default';


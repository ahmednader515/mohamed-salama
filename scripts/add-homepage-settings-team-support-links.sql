-- إضافة أعمدة: روابط دعم الفريق (واتساب + فيسبوك) لجدول إعدادات الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا جدول HomepageSetting موجود مسبقاً وبدون هذه الأعمدة

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_whatsapp_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_facebook_url TEXT;

-- لا نضع قيم افتراضية حتى لا تظهر الأزرار إلا عند ضبطها من لوحة التحكم
UPDATE "HomepageSetting"
SET
  team_whatsapp_url = COALESCE(team_whatsapp_url, NULL),
  team_facebook_url = COALESCE(team_facebook_url, NULL),
  updated_at = NOW()
WHERE id = 'default';

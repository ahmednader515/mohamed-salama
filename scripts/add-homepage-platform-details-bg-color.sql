-- إضافة لون خلفية لقسم تفاصيل المنصة في الصفحة الرئيسية
ALTER TABLE "HomepageSetting"
ADD COLUMN IF NOT EXISTS platform_details_background_color TEXT;

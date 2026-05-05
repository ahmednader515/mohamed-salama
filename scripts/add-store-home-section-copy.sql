-- نص قسم «متجر المنصة» في الصفحة الرئيسية (Neon / PostgreSQL)
-- شغّل هذا في SQL Editor في لوحة Neon بعد الاتصال بقاعدة مشروعك.

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description TEXT;

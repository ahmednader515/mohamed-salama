-- نص عنوان ووصف قسم «تعليقات الطلاب» في الصفحة الرئيسية (إعدادات الأدمن)
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_subtitle TEXT;

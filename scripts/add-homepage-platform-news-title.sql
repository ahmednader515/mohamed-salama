-- عنوان قسم أخبار المنصة في الصفحة الرئيسية (قابل للتعديل من لوحة التحكم)
-- نفّذ بعد scripts التي تضيف platform_news_enabled و platform_news_items

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_section_title TEXT;

UPDATE "HomepageSetting"
SET platform_news_section_title = 'أخبار المنصة', updated_at = NOW()
WHERE id = 'default' AND platform_news_section_title IS NULL;

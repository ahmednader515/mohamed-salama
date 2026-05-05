-- إضافة قسم تفاصيل المنصة في الصفحة الرئيسية
-- تفعيل/إخفاء + عنوان + وصف + بطاقات (JSON)

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_items TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_background_color TEXT;

UPDATE "HomepageSetting"
SET
  platform_details_title = COALESCE(platform_details_title, '“قلم” الحل المثالي!'),
  platform_details_subtitle = COALESCE(platform_details_subtitle, 'تعرف على أهم ما يميز المنصة'),
  platform_details_items = COALESCE(
    platform_details_items,
    '[
      {"id":"platform-detail-1","title":"فصول افتراضية فورية","description":"تصميم الفصول والمعلومات خلال الفصول الافتراضية.","iconType":"preset","presetIcon":"book","customIconUrl":null},
      {"id":"platform-detail-2","title":"محتوى جذاب في دقائق","description":"تصميم وإنشاء المحتوى التعليمي بشكل سريع ومميز.","iconType":"preset","presetIcon":"pencil","customIconUrl":null},
      {"id":"platform-detail-3","title":"أنشطة وفعاليات رائعة","description":"تجذب الطلاب وتنشئ تفاعلهم بعد أو داخل الصف الدراسي.","iconType":"preset","presetIcon":"bulb","customIconUrl":null},
      {"id":"platform-detail-4","title":"تواصل فعال","description":"أدوات للتواصل والتعاون الفعال بين كل أطراف العملية التعليمية.","iconType":"preset","presetIcon":"chat","customIconUrl":null}
    ]'
  ),
  updated_at = NOW()
WHERE id = 'default';

-- إضافة أعمدة نصوص قسم CTA (انطلاقة تعليمية أقوى) في الصفحة الرئيسية
-- شغّله من لوحة Neon → SQL Editor إذا كانت الأعمدة غير موجودة

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_badge_text TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_description TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_button_text TEXT;

-- قيم افتراضية للسجل الرئيسي
UPDATE "HomepageSetting"
SET
  cta_badge_text = COALESCE(cta_badge_text, 'انطلاقة تعليمية أقوى'),
  cta_title = COALESCE(cta_title, 'جاهز تحوّل حلمك لنتيجة حقيقية؟'),
  cta_description = COALESCE(
    cta_description,
    'ابدأ الآن بخطوة واثقة: محتوى منظم، شرح واضح، وتمارين عملية تساعدك تثبّت المعلومة بسرعة. كل درس تقطعه اليوم يقرّبك من مستواك اللي تستحقه بكرة.'
  ),
  cta_button_text = COALESCE(cta_button_text, 'ابدأ رحلتك الآن'),
  updated_at = NOW()
WHERE id = 'default';


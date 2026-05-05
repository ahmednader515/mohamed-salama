-- تدرج لوني مخصّص للهيرو (اختياري). نفّذه في Neon إن لم يُضَف العمودان تلقائياً من التطبيق.
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_from TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_to TEXT;

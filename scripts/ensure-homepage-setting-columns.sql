-- مزامنة جميع أعمدة "HomepageSetting" مع ما يتوقعه التطبيق (lib/db.ts + نموذج الإعدادات).
-- شغّله مرة واحدة من Neon SQL Editor على نفس المشروع/الفرع المربوط بـ DATABASE_URL في التطبيق.
-- أكثر اكتمالاً من scripts/add-homepage-settings-whatsapp-facebook-title.sql (الذي يغطي 3 حقولاً فقط).

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS teacher_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slogan TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_name TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS whatsapp_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS page_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_preset TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_tagline TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_copyright TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_subtitle TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_1 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_2 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_3 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_4 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_course_id_5 TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS header_logo_url TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS youtube_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_whatsapp_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS telegram_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_facebook_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_youtube_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_linkedin_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS team_telegram_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_right_label TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_label TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_badge_text TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_description TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_button_text TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_name_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slogan_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS page_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_right_label_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS social_left_label_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_subtitle_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_tagline_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS footer_copyright_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS reviews_section_subtitle_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_badge_text_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_description_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS cta_button_text_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_subtitle_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_section_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_subtitle_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_method_title_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_transfer_instruction_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_confirmation_note_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_button_text_en TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_waiting_note_en TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_from TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_bg_custom_to TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_template TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_1 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_2 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_3 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_4 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_image_5 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_slider_interval_ms INTEGER;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_phone_bg_color TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_1_link TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_image_url TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero3_store_badge_2_link TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS teachers_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS subscriptions_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_background_color TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_details_items TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_items TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS platform_news_section_title TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_method_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_transfer_instruction TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_wallet_number TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_confirmation_note TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_number TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_button_text TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_waiting_note TEXT;

ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS copyright_overlay_style TEXT;

-- صور عائمة للهيرو (القالب الكلاسيكي)
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_1 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_2 TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS hero_float_image_3 TEXT;

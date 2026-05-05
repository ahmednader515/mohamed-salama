-- إعدادات صفحة إضافة الرصيد (نصوص + أرقام الدفع)
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_subtitle TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_method_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_transfer_instruction TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_wallet_number TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_confirmation_note TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_number TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_whatsapp_button_text TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS add_balance_waiting_note TEXT;

UPDATE "HomepageSetting"
SET
  add_balance_title = COALESCE(add_balance_title, 'إضافة رصيد'),
  add_balance_subtitle = COALESCE(add_balance_subtitle, 'اختر طريقة الدفع ثم اتبع التعليمات'),
  add_balance_method_title = COALESCE(add_balance_method_title, 'فودافون كاش'),
  add_balance_transfer_instruction = COALESCE(add_balance_transfer_instruction, 'قم بتحويل المبلغ المطلوب إلى رقم المحفظة التالي:'),
  add_balance_wallet_number = COALESCE(add_balance_wallet_number, '01023005622'),
  add_balance_confirmation_note = COALESCE(add_balance_confirmation_note, 'بعد التحويل، يجب إرسال صورة تأكيد التحويل على واتساب على الرقم'),
  add_balance_whatsapp_number = COALESCE(add_balance_whatsapp_number, '966553612356'),
  add_balance_whatsapp_button_text = COALESCE(add_balance_whatsapp_button_text, 'إرسال صورة التأكيد على واتساب'),
  add_balance_waiting_note = COALESCE(add_balance_waiting_note, 'بعد إرسال صورة التأكيد، يكون رصيدك في انتظار وصوله إلى حسابك. سيتم إضافة الرصيد خلال أقرب وقت.')
WHERE id = 'default';

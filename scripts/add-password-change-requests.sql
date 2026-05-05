-- ============================================================
-- طلبات تغيير كلمة مرور المستخدمين (نسيان كلمة المرور)
-- شغّل من لوحة Neon (SQL Editor) مرة واحدة بعد إضافة الميزة
-- ============================================================

CREATE TABLE IF NOT EXISTS "PasswordChangeRequest" (
  id                            TEXT PRIMARY KEY,
  user_id                       TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  new_password_hash             TEXT NOT NULL,
  requested_identifier         TEXT,
  requested_old_password       TEXT,
  requested_new_password_plain TEXT,
  status                        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at                  TIMESTAMPTZ,
  processed_by_id               TEXT REFERENCES "User"(id) ON DELETE SET NULL
);

-- لو الجدول موجود مسبقاً بدون الأعمدة:
ALTER TABLE "PasswordChangeRequest" ADD COLUMN IF NOT EXISTS requested_identifier TEXT;
ALTER TABLE "PasswordChangeRequest" ADD COLUMN IF NOT EXISTS requested_old_password TEXT;
ALTER TABLE "PasswordChangeRequest" ADD COLUMN IF NOT EXISTS requested_new_password_plain TEXT;

CREATE INDEX IF NOT EXISTS "PasswordChangeRequest_user_id_idx" ON "PasswordChangeRequest"(user_id);
CREATE INDEX IF NOT EXISTS "PasswordChangeRequest_status_idx" ON "PasswordChangeRequest"(status);
CREATE INDEX IF NOT EXISTS "PasswordChangeRequest_created_at_idx" ON "PasswordChangeRequest"(created_at DESC);

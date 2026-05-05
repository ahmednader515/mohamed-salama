-- كود حقوق الطبع والنشر لكل طالب (علامة مائية قابلة للبحث من لوحة الطلاب)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS copyright_code VARCHAR(10);

CREATE UNIQUE INDEX IF NOT EXISTS user_copyright_code_unique
  ON "User" (copyright_code)
  WHERE copyright_code IS NOT NULL AND TRIM(copyright_code) <> '';

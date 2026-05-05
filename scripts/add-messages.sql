-- التواصل الخاص بين الأدمن/مساعد الأدمن والطلبة
-- شغّله مرة واحدة من لوحة Neon: SQL Editor

-- 1) جدول المحادثات (دردشة واحدة بين موظف وأحد الطلبة)
CREATE TABLE IF NOT EXISTS "Conversation" (
  id                TEXT PRIMARY KEY,
  staff_user_id     TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  student_user_id   TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_user_id, student_user_id)
);

CREATE INDEX IF NOT EXISTS "Conversation_staff_user_id_idx" ON "Conversation"(staff_user_id);
CREATE INDEX IF NOT EXISTS "Conversation_student_user_id_idx" ON "Conversation"(student_user_id);

-- 2) جدول الرسائل
CREATE TABLE IF NOT EXISTS "Message" (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES "Conversation"(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  message_type    TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'file')),
  content         TEXT,
  file_url        TEXT,
  file_name       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Message_conversation_id_idx" ON "Message"(conversation_id);
CREATE INDEX IF NOT EXISTS "Message_created_at_idx" ON "Message"(created_at);

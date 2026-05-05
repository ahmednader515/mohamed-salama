-- اشتراكات المنصة الشاملة (كل الدورات المدفوعة) — نفّذه في Neon إن لزم
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS subscriptions_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  image_url    TEXT,
  duration_kind TEXT NOT NULL CHECK (duration_kind IN ('week', 'month', 'year')),
  price        DECIMAL(10, 2) NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_active_sort_idx" ON "SubscriptionPlan"(is_active, sort_order);

CREATE TABLE IF NOT EXISTS "UserPlatformSubscription" (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  plan_id    TEXT REFERENCES "SubscriptionPlan"(id) ON DELETE SET NULL,
  price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UserPlatformSubscription_user_expires_idx" ON "UserPlatformSubscription"(user_id, expires_at);

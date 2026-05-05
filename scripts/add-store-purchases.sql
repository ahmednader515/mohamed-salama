CREATE TABLE IF NOT EXISTS "UserStorePurchase" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES "StoreProduct"(id) ON DELETE CASCADE,
  price_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS "UserStorePurchase_user_idx" ON "UserStorePurchase"(user_id, created_at DESC);

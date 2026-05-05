ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_title TEXT;
ALTER TABLE "HomepageSetting" ADD COLUMN IF NOT EXISTS store_section_description TEXT;

CREATE TABLE IF NOT EXISTS "StoreProduct" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  image_url TEXT,
  pdf_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "StoreProduct_active_sort_idx" ON "StoreProduct"(is_active, sort_order, created_at DESC);

ALTER TABLE "StoreProduct" ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0;

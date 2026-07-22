-- Global SMS test settings (single row). "allowlist" is a comma-separated
-- string of test-safe recipient numbers. While a send is restricted
-- (non-production runtime, or a Company.isTest account in production) only
-- numbers in this string are actually delivered by the outbound SMS guard.
CREATE TABLE IF NOT EXISTS "sms_test_config" (
  "id"         SERIAL PRIMARY KEY,
  "allowlist"  TEXT NOT NULL DEFAULT '+18788797134,+16783739090,+14702560094',
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single config row with the default numbers (idempotent: only when
-- the table has no row yet). Update this row later to change the allowlist.
INSERT INTO "sms_test_config" ("allowlist")
SELECT '+18788797134,+16783739090,+14702560094'
WHERE NOT EXISTS (SELECT 1 FROM "sms_test_config");

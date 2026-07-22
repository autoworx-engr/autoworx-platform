-- Add is_test flag to Company. Test/QA accounts (also present in production)
-- are exercised with fake/invalid numbers; the outbound SMS guard restricts
-- these companies to SMS_TEST_ALLOWLIST even in production so they cannot
-- generate real error-30006 traffic against the live Twilio account.
ALTER TABLE "Company"
ADD COLUMN IF NOT EXISTS "is_test" BOOLEAN NOT NULL DEFAULT false;

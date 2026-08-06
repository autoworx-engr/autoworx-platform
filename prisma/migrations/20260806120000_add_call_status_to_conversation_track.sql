-- AlterTable: track live call state on the conversation row.
-- Calls reuse `sms_last_message` for their preview line in the client list, so
-- these columns let the UI tell a call that is still ringing/connected from one
-- that has finished — and stop rendering stale "Incoming call" previews.
ALTER TABLE "ClientConversationTrack"
    ADD COLUMN IF NOT EXISTS "call_status" TEXT,
    ADD COLUMN IF NOT EXISTS "call_updated_at" TIMESTAMP(3);

-- AlterTable: distinguish the missed-call system marker from a real text so the
-- SMS thread can render it as a divider instead of a message bubble.
ALTER TABLE "ClientSMS"
    ADD COLUMN IF NOT EXISTS "message_type" TEXT DEFAULT 'SMS';

-- Backfill: any ClientCall row still marked ringing/in-progress more than an
-- hour after it was created never received its final Twilio callback. Settle
-- them as missed so they stop rendering as live calls forever.
UPDATE "ClientCall"
SET "status" = 'no-answer'
WHERE "status" IN ('ringing', 'in-progress')
  AND "created_at" < NOW() - INTERVAL '1 hour';

-- Add Messenger/Facebook columns to ClientConversationTrack.
-- The schema was updated from meta_* to messenger_* field names but no migration
-- was written. The DB retains the old meta_* columns (now orphaned/unused by Prisma).
-- This migration adds the four messenger_* columns the schema now expects.
-- Existing meta_* columns are left as-is — safe to drop manually later if confirmed unused.
ALTER TABLE "ClientConversationTrack"
  ADD COLUMN IF NOT EXISTS "messenger_is_read"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "messenger_unread_count"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "messenger_last_message"  TEXT,
  ADD COLUMN IF NOT EXISTS "messenger_last_by"       TEXT;

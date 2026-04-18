-- Add Meta (Facebook + Instagram) integration models

-- MetaCredentials: one row per connected Facebook Page per company
CREATE TABLE "MetaCredentials" (
  "id"                   SERIAL PRIMARY KEY,
  "company_id"           INTEGER NOT NULL,
  "page_id"              TEXT NOT NULL,
  "page_name"            TEXT,
  "page_access_token"    TEXT NOT NULL,
  "instagram_account_id" TEXT,
  "instagram_username"   TEXT,
  "meta_user_id"         TEXT NOT NULL,
  "is_active"            BOOLEAN NOT NULL DEFAULT true,
  "created_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MetaCredentials_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "MetaCredentials_company_id_page_id_key"
  ON "MetaCredentials"("company_id", "page_id");

-- ClientMetaMessage: individual messages sent/received via FB/IG Messenger
CREATE TABLE "ClientMetaMessage" (
  "id"              SERIAL PRIMARY KEY,
  "message"         TEXT NOT NULL,
  "platform"        TEXT NOT NULL,
  "meta_message_id" TEXT,
  "meta_sender_id"  TEXT NOT NULL,
  "sentBy"          "ClientSMSSentBy" NOT NULL,
  "is_read"         BOOLEAN NOT NULL DEFAULT false,
  "user_id"         INTEGER,
  "company_id"      INTEGER NOT NULL,
  "client_id"       INTEGER NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMetaMessage_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE CASCADE,
  CONSTRAINT "ClientMetaMessage_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "ClientMetaMessage_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE
);

-- ClientMetaAttachments: media attached to a ClientMetaMessage
CREATE TABLE "ClientMetaAttachments" (
  "id"                    SERIAL PRIMARY KEY,
  "client_meta_message_id" INTEGER NOT NULL,
  "url"                   TEXT NOT NULL,
  "name"                  TEXT,
  "type"                  TEXT,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClientMetaAttachments_client_meta_message_id_fkey"
    FOREIGN KEY ("client_meta_message_id") REFERENCES "ClientMetaMessage"("id") ON DELETE CASCADE
);

-- Add meta_sender_id to Client for matching inbound messages to a client
ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "meta_sender_id" TEXT;

-- Add Meta conversation tracking fields to ClientConversationTrack
ALTER TABLE "ClientConversationTrack"
  ADD COLUMN IF NOT EXISTS "meta_last_message"  TEXT,
  ADD COLUMN IF NOT EXISTS "meta_is_read"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "meta_unread_count"  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "meta_last_platform" TEXT;

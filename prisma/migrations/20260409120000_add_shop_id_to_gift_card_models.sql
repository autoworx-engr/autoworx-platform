-- Add shopId to gift card models for shop-level isolation

-- DropIndex (old company-scoped indexes/constraints)
DROP INDEX IF EXISTS "gift_card_promos_company_id_code_key";
DROP INDEX IF EXISTS "gift_card_settings_company_id_key";
DROP INDEX IF EXISTS "gift_card_templates_company_id_idx";
DROP INDEX IF EXISTS "issued_gift_cards_company_id_idx";

-- AlterTable: Add shop_id column to all gift card tables
ALTER TABLE "gift_card_settings" ADD COLUMN "shop_id" INTEGER;
ALTER TABLE "gift_card_templates" ADD COLUMN "shop_id" INTEGER;
ALTER TABLE "gift_card_promos" ADD COLUMN "shop_id" INTEGER;
ALTER TABLE "issued_gift_cards" ADD COLUMN "shop_id" INTEGER;

-- Backfill: Set shop_id from the first shop of the same company
UPDATE "gift_card_settings" gs
SET "shop_id" = (SELECT s."id" FROM "shops" s WHERE s."company_id" = gs."company_id" ORDER BY s."id" LIMIT 1)
WHERE gs."shop_id" IS NULL;

UPDATE "gift_card_templates" gt
SET "shop_id" = (SELECT s."id" FROM "shops" s WHERE s."company_id" = gt."company_id" ORDER BY s."id" LIMIT 1)
WHERE gt."shop_id" IS NULL;

UPDATE "gift_card_promos" gp
SET "shop_id" = (SELECT s."id" FROM "shops" s WHERE s."company_id" = gp."company_id" ORDER BY s."id" LIMIT 1)
WHERE gp."shop_id" IS NULL;

UPDATE "issued_gift_cards" igc
SET "shop_id" = (SELECT s."id" FROM "shops" s WHERE s."company_id" = igc."company_id" ORDER BY s."id" LIMIT 1)
WHERE igc."shop_id" IS NULL;

-- Remove any orphaned rows (no matching shop)
DELETE FROM "gift_card_settings" WHERE "shop_id" IS NULL;
DELETE FROM "gift_card_templates" WHERE "shop_id" IS NULL;
DELETE FROM "gift_card_promos" WHERE "shop_id" IS NULL;
DELETE FROM "issued_gift_cards" WHERE "shop_id" IS NULL;

-- Make shop_id NOT NULL after backfill
ALTER TABLE "gift_card_settings" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "gift_card_templates" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "gift_card_promos" ALTER COLUMN "shop_id" SET NOT NULL;
ALTER TABLE "issued_gift_cards" ALTER COLUMN "shop_id" SET NOT NULL;

-- CreateIndex: Shop-scoped indexes and constraints
CREATE UNIQUE INDEX "gift_card_settings_shop_id_key" ON "gift_card_settings"("shop_id");
CREATE INDEX "gift_card_templates_shop_id_idx" ON "gift_card_templates"("shop_id");
CREATE INDEX "gift_card_promos_shop_id_idx" ON "gift_card_promos"("shop_id");
CREATE UNIQUE INDEX "gift_card_promos_shop_id_code_key" ON "gift_card_promos"("shop_id", "code");
CREATE INDEX "issued_gift_cards_shop_id_idx" ON "issued_gift_cards"("shop_id");

-- AddForeignKey: Link to shops table
ALTER TABLE "gift_card_settings" ADD CONSTRAINT "gift_card_settings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gift_card_templates" ADD CONSTRAINT "gift_card_templates_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gift_card_promos" ADD CONSTRAINT "gift_card_promos_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "issued_gift_cards" ADD CONSTRAINT "issued_gift_cards_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

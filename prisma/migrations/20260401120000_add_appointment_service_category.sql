ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT '#94A3B8';

ALTER TABLE "Appointment"
ADD COLUMN IF NOT EXISTS "service_category_id" INTEGER;

CREATE INDEX IF NOT EXISTS "Appointment_service_category_id_idx"
ON "Appointment"("service_category_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Appointment_service_category_id_fkey'
  ) THEN
    ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_service_category_id_fkey"
    FOREIGN KEY ("service_category_id") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

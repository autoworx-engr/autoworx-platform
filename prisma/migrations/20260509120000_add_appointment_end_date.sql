-- Add optional endDate column for multi-day appointments.
-- Existing rows keep end_date = NULL, which the app treats as single-day (end_date implicitly equals date).
ALTER TABLE "Appointment"
ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Appointment_end_date_idx"
ON "Appointment"("end_date");

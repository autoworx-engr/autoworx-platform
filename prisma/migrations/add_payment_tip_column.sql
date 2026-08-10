-- Add tip column to Payment table
ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "tip" DECIMAL(8, 2) NOT NULL DEFAULT 0;

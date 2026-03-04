-- prisma/migrations/20260305_report_pricing/migration.sql
BEGIN;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "priceRub" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "totalRub" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "pricingJson" JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_totalRub_idx'
  ) THEN
    CREATE INDEX "Report_totalRub_idx" ON "Report" ("totalRub");
  END IF;
END$$;

COMMIT;

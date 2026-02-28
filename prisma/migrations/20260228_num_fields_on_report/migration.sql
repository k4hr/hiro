-- prisma/migrations/20260228_num_fields_on_report/migration.sql

BEGIN;

-- 1) Enum NumMode (если нет)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NumMode') THEN
    CREATE TYPE "NumMode" AS ENUM ('DATE', 'COMBO', 'COMPAT');
  END IF;
END$$;

-- 2) Новые поля в Report
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "numMode" "NumMode",
  ADD COLUMN IF NOT EXISTS "numDob1" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "numName1" TEXT,
  ADD COLUMN IF NOT EXISTS "numDob2" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "numName2" TEXT;

-- 3) Индексы (если нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_numMode_idx'
  ) THEN
    CREATE INDEX "Report_numMode_idx" ON "Report" ("numMode");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_numDob1_idx'
  ) THEN
    CREATE INDEX "Report_numDob1_idx" ON "Report" ("numDob1");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_numDob2_idx'
  ) THEN
    CREATE INDEX "Report_numDob2_idx" ON "Report" ("numDob2");
  END IF;
END$$;

COMMIT;

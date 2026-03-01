-- prisma/migrations/20260301_add_report_astro_fields/migration.sql

BEGIN;

-- 1) Добавляем поля для ASTRO в Report
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroDob" TIMESTAMPTZ;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroTime" TEXT;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroCity" TEXT;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroAccuracyLevel" INTEGER;

-- 2) Индексы под новые поля (все IF NOT EXISTS через pg_indexes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroDob_idx'
  ) THEN
    CREATE INDEX "Report_astroDob_idx" ON "Report" ("astroDob");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroCity_idx'
  ) THEN
    CREATE INDEX "Report_astroCity_idx" ON "Report" ("astroCity");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroTime_idx'
  ) THEN
    CREATE INDEX "Report_astroTime_idx" ON "Report" ("astroTime");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroAccuracyLevel_idx'
  ) THEN
    CREATE INDEX "Report_astroAccuracyLevel_idx" ON "Report" ("astroAccuracyLevel");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_userId_astroDob_astroCity_astroTime_idx'
  ) THEN
    CREATE INDEX "Report_userId_astroDob_astroCity_astroTime_idx"
      ON "Report" ("userId", "astroDob", "astroCity", "astroTime");
  END IF;
END
$$;

COMMIT;

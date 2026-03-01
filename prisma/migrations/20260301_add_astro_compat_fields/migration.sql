-- prisma/migrations/20260301_add_astro_compat_fields/migration.sql

BEGIN;

-- 1) Enum AstroMode (если ещё нет)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AstroMode') THEN
    CREATE TYPE "AstroMode" AS ENUM ('CHART', 'COMPAT');
  END IF;
END$$;

-- 2) Поля в Report
ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroMode" "AstroMode";

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroDob2" TIMESTAMPTZ;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroTime2" TEXT;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroCity2" TEXT;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "astroAccuracyLevel2" INTEGER;

-- 3) Индексы (в стиле твоих миграций)

-- одиночные индексы
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroMode_idx'
  ) THEN
    CREATE INDEX "Report_astroMode_idx" ON "Report" ("astroMode");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroDob2_idx'
  ) THEN
    CREATE INDEX "Report_astroDob2_idx" ON "Report" ("astroDob2");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroCity2_idx'
  ) THEN
    CREATE INDEX "Report_astroCity2_idx" ON "Report" ("astroCity2");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroTime2_idx'
  ) THEN
    CREATE INDEX "Report_astroTime2_idx" ON "Report" ("astroTime2");
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_astroAccuracyLevel2_idx'
  ) THEN
    CREATE INDEX "Report_astroAccuracyLevel2_idx" ON "Report" ("astroAccuracyLevel2");
  END IF;
END$$;

-- быстрый поиск для карты (один человек): (userId, astroMode, astroDob, astroCity, astroTime)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_userId_astroMode_astroDob_astroCity_astroTime_idx'
  ) THEN
    CREATE INDEX "Report_userId_astroMode_astroDob_astroCity_astroTime_idx"
      ON "Report" ("userId", "astroMode", "astroDob", "astroCity", "astroTime");
  END IF;
END$$;

-- быстрый поиск для совместимости (пара):
-- (userId, astroMode, astroDob, astroCity, astroTime, astroDob2, astroCity2, astroTime2)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'Report_userId_astroMode_astroDob_astroCity_astroTime_astroDob2_astroCity2_astroTime2_idx'
  ) THEN
    CREATE INDEX "Report_userId_astroMode_astroDob_astroCity_astroTime_astroDob2_astroCity2_astroTime2_idx"
      ON "Report" ("userId", "astroMode", "astroDob", "astroCity", "astroTime", "astroDob2", "astroCity2", "astroTime2");
  END IF;
END$$;

COMMIT;

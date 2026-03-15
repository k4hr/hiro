BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ReportStatus'
  ) THEN
    RAISE EXCEPTION 'Enum "ReportStatus" not found';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ReportStatus'
      AND e.enumlabel = 'ANALYZING'
  ) THEN
    ALTER TYPE "ReportStatus" ADD VALUE 'ANALYZING';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ReportStatus'
      AND e.enumlabel = 'PROCESSING'
  ) THEN
    ALTER TYPE "ReportStatus" ADD VALUE 'PROCESSING';
  END IF;
END$$;

COMMIT;

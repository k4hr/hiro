-- prisma/migrations/20260227_init_arcanum/migration.sql
BEGIN;

-- ===========================
-- ✅ ENUMS
-- ===========================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportType') THEN
    CREATE TYPE "ReportType" AS ENUM ('PALM','NUM','ASTRO','SYNTH');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportStatus') THEN
    CREATE TYPE "ReportStatus" AS ENUM ('DRAFT','READY','FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PalmSide') THEN
    CREATE TYPE "PalmSide" AS ENUM ('LEFT','RIGHT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PalmScanStatus') THEN
    CREATE TYPE "PalmScanStatus" AS ENUM ('DRAFT','ANALYZING','READY','BAD_PHOTO','FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShareStatus') THEN
    CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE','REVOKED','EXPIRED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Handedness') THEN
    CREATE TYPE "Handedness" AS ENUM ('RIGHT','LEFT','AMBI');
  END IF;
END$$;

-- ===========================
-- ✅ TABLES
-- ===========================

-- User
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "telegramId" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "locale" TEXT DEFAULT 'ru',
  "meta" JSONB,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_telegramId_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_telegramId_key" UNIQUE ("telegramId");
  END IF;
END$$;

-- Profile
CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "dob" TIMESTAMP(3),
  "birthTime" TEXT,
  "birthCity" TEXT,
  "birthMeta" JSONB,
  "displayName" TEXT,
  "handedness" "Handedness",
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Profile_userId_key'
  ) THEN
    ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_key" UNIQUE ("userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Profile_userId_fkey'
  ) THEN
    ALTER TABLE "Profile"
      ADD CONSTRAINT "Profile_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- PalmScan
CREATE TABLE IF NOT EXISTS "PalmScan" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "leftImageUrl" TEXT,
  "rightImageUrl" TEXT,
  "leftMeta" JSONB,
  "rightMeta" JSONB,
  "status" "PalmScanStatus" NOT NULL DEFAULT 'DRAFT',
  "aiJson" JSONB,
  "aiText" TEXT,
  "confidence" DOUBLE PRECISION,
  "qualityFlag" BOOLEAN NOT NULL DEFAULT FALSE,
  "qualityNote" TEXT,
  "errorCode" TEXT,
  "errorText" TEXT,
  CONSTRAINT "PalmScan_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PalmScan_userId_fkey'
  ) THEN
    ALTER TABLE "PalmScan"
      ADD CONSTRAINT "PalmScan_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- Report
CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "ReportType" NOT NULL,
  "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
  "json" JSONB,
  "text" TEXT,
  "palmScanId" TEXT,
  "input" JSONB,
  "confidence" DOUBLE PRECISION,
  "errorCode" TEXT,
  "errorText" TEXT,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_userId_fkey'
  ) THEN
    ALTER TABLE "Report"
      ADD CONSTRAINT "Report_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Report_palmScanId_fkey'
  ) THEN
    ALTER TABLE "Report"
      ADD CONSTRAINT "Report_palmScanId_fkey"
      FOREIGN KEY ("palmScanId") REFERENCES "PalmScan"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

-- ReportShare
CREATE TABLE IF NOT EXISTS "ReportShare" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "maxViews" INTEGER,
  "views" INTEGER NOT NULL DEFAULT 0,
  "meta" JSONB,
  CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReportShare_token_key'
  ) THEN
    ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_token_key" UNIQUE ("token");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReportShare_userId_fkey'
  ) THEN
    ALTER TABLE "ReportShare"
      ADD CONSTRAINT "ReportShare_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ReportShare_reportId_fkey'
  ) THEN
    ALTER TABLE "ReportShare"
      ADD CONSTRAINT "ReportShare_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "Report"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

-- ===========================
-- ✅ INDEXES (как в @@index)
-- ===========================

CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User" ("createdAt");
CREATE INDEX IF NOT EXISTS "User_telegramId_idx" ON "User" ("telegramId");

CREATE INDEX IF NOT EXISTS "Profile_userId_idx" ON "Profile" ("userId");
CREATE INDEX IF NOT EXISTS "Profile_dob_idx" ON "Profile" ("dob");

CREATE INDEX IF NOT EXISTS "PalmScan_userId_idx" ON "PalmScan" ("userId");
CREATE INDEX IF NOT EXISTS "PalmScan_status_idx" ON "PalmScan" ("status");
CREATE INDEX IF NOT EXISTS "PalmScan_createdAt_idx" ON "PalmScan" ("createdAt");
CREATE INDEX IF NOT EXISTS "PalmScan_userId_status_createdAt_idx" ON "PalmScan" ("userId","status","createdAt");

CREATE INDEX IF NOT EXISTS "Report_userId_idx" ON "Report" ("userId");
CREATE INDEX IF NOT EXISTS "Report_type_idx" ON "Report" ("type");
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report" ("status");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report" ("createdAt");
CREATE INDEX IF NOT EXISTS "Report_userId_type_createdAt_idx" ON "Report" ("userId","type","createdAt");
CREATE INDEX IF NOT EXISTS "Report_palmScanId_idx" ON "Report" ("palmScanId");

CREATE INDEX IF NOT EXISTS "ReportShare_userId_idx" ON "ReportShare" ("userId");
CREATE INDEX IF NOT EXISTS "ReportShare_reportId_idx" ON "ReportShare" ("reportId");
CREATE INDEX IF NOT EXISTS "ReportShare_status_idx" ON "ReportShare" ("status");
CREATE INDEX IF NOT EXISTS "ReportShare_expiresAt_idx" ON "ReportShare" ("expiresAt");
CREATE INDEX IF NOT EXISTS "ReportShare_token_idx" ON "ReportShare" ("token");

COMMIT;

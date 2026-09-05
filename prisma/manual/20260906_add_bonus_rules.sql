-- Catalogo de bonos por salon y los otorgamientos manuales
--
-- Fase 2 del plan de nomina con bonos.
--
-- Migracion ADITIVA: crea un tipo y dos tablas nuevas. No toca ninguna tabla
-- existente ni mueve un solo dato.
--
-- Aplicar (desde la raiz del proyecto):
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_bonus_rules.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_bonus_rules.sql --aplicar
--
-- Despues: npx prisma generate

DO $$
BEGIN
  CREATE TYPE "BonusType" AS ENUM ('PUNCTUALITY', 'SERVICES', 'REVENUE', 'CLIENTS', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "BonusRule" (
  "id"          TEXT NOT NULL,
  "businessId"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "type"        "BonusType" NOT NULL,
  "amount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "goal"        DOUBLE PRECISION,
  "maxLates"    INTEGER NOT NULL DEFAULT 0,
  "maxAbsences" INTEGER NOT NULL DEFAULT 0,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BonusAward" (
  "id"          TEXT NOT NULL,
  "businessId"  TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "ruleId"      TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd"   DATE NOT NULL,
  "granted"     BOOLEAN NOT NULL DEFAULT true,
  "amount"      DOUBLE PRECISION,
  "note"        TEXT,
  "grantedById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BonusAward_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BonusRule_businessId_active_idx"
  ON "BonusRule" ("businessId", "active");

CREATE INDEX IF NOT EXISTS "BonusAward_businessId_periodStart_idx"
  ON "BonusAward" ("businessId", "periodStart");

-- Un bono por persona por periodo.
CREATE UNIQUE INDEX IF NOT EXISTS "BonusAward_businessId_employeeId_ruleId_periodStart_key"
  ON "BonusAward" ("businessId", "employeeId", "ruleId", "periodStart");

-- Las llaves foraneas no admiten IF NOT EXISTS, asi que se consultan antes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusRule_businessId_fkey') THEN
    ALTER TABLE "BonusRule"
      ADD CONSTRAINT "BonusRule_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusAward_businessId_fkey') THEN
    ALTER TABLE "BonusAward"
      ADD CONSTRAINT "BonusAward_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusAward_employeeId_fkey') THEN
    ALTER TABLE "BonusAward"
      ADD CONSTRAINT "BonusAward_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusAward_ruleId_fkey') THEN
    ALTER TABLE "BonusAward"
      ADD CONSTRAINT "BonusAward_ruleId_fkey"
      FOREIGN KEY ("ruleId") REFERENCES "BonusRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BonusAward_grantedById_fkey') THEN
    ALTER TABLE "BonusAward"
      ADD CONSTRAINT "BonusAward_grantedById_fkey"
      FOREIGN KEY ("grantedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

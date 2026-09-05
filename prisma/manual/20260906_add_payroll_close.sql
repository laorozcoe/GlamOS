-- Cerrar la nomina: congelar lo que se pago
--
-- Fase 7 del plan.
--
-- Migracion ADITIVA: tres tablas nuevas. Ninguna tabla existente se toca.
--
-- Mientras un periodo no este en PayrollPeriod, la nomina se sigue
-- recalculando como hasta ahora. Cerrar es opcional y por periodo.
--
-- Aplicar:
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_payroll_close.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_payroll_close.sql --aplicar
--
-- Despues: npx prisma generate

CREATE TABLE IF NOT EXISTS "PayrollPeriod" (
  "id"          TEXT NOT NULL,
  "businessId"  TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd"   DATE NOT NULL,
  "closedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedById"  TEXT,
  "total"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollLine" (
  "id"                   TEXT NOT NULL,
  "periodId"             TEXT NOT NULL,
  "employeeId"           TEXT NOT NULL,
  "employeeName"         TEXT NOT NULL,
  "role"                 TEXT NOT NULL,
  "baseSalary"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salesBase"            DOUBLE PRECISION NOT NULL DEFAULT 0,
  "commissionPay"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "bonusTotal"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "totalPay"             DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "PayrollLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayrollLineBonus" (
  "id"      TEXT NOT NULL,
  "lineId"  TEXT NOT NULL,
  "ruleId"  TEXT,
  "name"    TEXT NOT NULL,
  "amount"  DOUBLE PRECISION NOT NULL DEFAULT 0,
  "granted" BOOLEAN NOT NULL DEFAULT false,
  "reason"  TEXT,
  "manual"  BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "PayrollLineBonus_pkey" PRIMARY KEY ("id")
);

-- Un solo cierre por salon y periodo.
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollPeriod_businessId_periodStart_key"
  ON "PayrollPeriod" ("businessId", "periodStart");
CREATE INDEX IF NOT EXISTS "PayrollPeriod_businessId_periodStart_idx"
  ON "PayrollPeriod" ("businessId", "periodStart");
CREATE INDEX IF NOT EXISTS "PayrollLine_periodId_idx" ON "PayrollLine" ("periodId");
CREATE INDEX IF NOT EXISTS "PayrollLineBonus_lineId_idx" ON "PayrollLineBonus" ("lineId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPeriod_businessId_fkey') THEN
    ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPeriod_closedById_fkey') THEN
    ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_closedById_fkey"
      FOREIGN KEY ("closedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  -- Borrar un cierre se lleva sus renglones: reabrir un periodo es
  -- exactamente eso, y no debe dejar basura suelta.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollLine_periodId_fkey') THEN
    ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_periodId_fkey"
      FOREIGN KEY ("periodId") REFERENCES "PayrollPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollLine_employeeId_fkey') THEN
    ALTER TABLE "PayrollLine" ADD CONSTRAINT "PayrollLine_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PayrollLineBonus_lineId_fkey') THEN
    ALTER TABLE "PayrollLineBonus" ADD CONSTRAINT "PayrollLineBonus_lineId_fkey"
      FOREIGN KEY ("lineId") REFERENCES "PayrollLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Tolerancia de retardo por salon y origen de la hora de asistencia
--
-- Fase 1 del plan de nomina con bonos.
--
-- Es una migracion ADITIVA: crea un tipo nuevo y agrega tres columnas con
-- valor por omision. No mueve ni borra un solo dato existente, y una base que
-- todavia no la tenga sigue funcionando con el codigo anterior.
--
-- Aplicar (desde la raiz del proyecto):
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_attendance_source_and_tolerance.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_attendance_source_and_tolerance.sql --aplicar
--
-- Sin --aplicar solo informa. DESPUES de aplicar hay que correr
-- `npx prisma generate`, nunca antes: generar primero deja al cliente
-- esperando columnas que la base todavia no tiene.

-- Minutos de gracia antes de que una entrada cuente como retardo.
-- 10 es el valor por omision; cada salon lo cambia en Configuracion.
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "lateToleranceMinutes" INTEGER NOT NULL DEFAULT 10;

-- De donde salio la hora de un registro de asistencia.
DO $$
BEGIN
  CREATE TYPE "AttendanceSource" AS ENUM ('SCHEDULE', 'MANUAL', 'CLOCK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Los registros que ya existen quedan como SCHEDULE, que es la verdad: se
-- guardaron con la hora programada precargada y nadie confirmo la real.
ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "source" "AttendanceSource" NOT NULL DEFAULT 'SCHEDULE';

ALTER TABLE "Attendance"
  ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;

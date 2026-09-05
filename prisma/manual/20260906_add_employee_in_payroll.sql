-- Separar "entra a nomina" de "aparece en la agenda"
--
-- Fase 6 del plan de nomina con bonos.
--
-- El interruptor de Empleados dice "Incluir en Nomina Semanal" y escribia
-- `bookable`, que significa "aparece en la agenda y en los selectores de
-- personal". Apagarlo sacaba a la persona del calendario y la dejaba igual en
-- la nomina, que lista a todos los empleados activos sin mirar ese campo.
--
-- Se agrega una columna propia y se copia el valor de `bookable`, porque eso
-- es lo que la gente creyo estar contestando cuando lo apago: la etiqueta
-- hablaba de nomina. `bookable` se queda como esta.
--
-- OJO: despues de esto, quien tuviera el interruptor apagado deja de aparecer
-- en la nomina -que es lo que se queria- y sigue sin aparecer en la agenda.
-- Revisa en Empleados el nuevo interruptor "Aparece en la agenda" para los
-- que si deban atender.
--
-- Aplicar:
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_employee_in_payroll.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_employee_in_payroll.sql --aplicar
--
-- Despues: npx prisma generate

ALTER TABLE "Employee"
  ADD COLUMN IF NOT EXISTS "inPayroll" BOOLEAN NOT NULL DEFAULT true;

-- Se hereda la intencion de lo que ya estaba contestado. Solo la primera vez:
-- si la columna ya existia con valores propios, esto no debe correr.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Employee" WHERE "inPayroll" = false
  ) THEN
    UPDATE "Employee" SET "inPayroll" = "bookable";
  END IF;
END
$$;

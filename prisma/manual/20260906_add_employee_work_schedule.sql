-- Horario por dia, con dia de descanso
--
-- Hasta ahora el horario eran cuatro columnas: entrada y salida de lunes a
-- viernes, y entrada y salida del sabado. El domingo estaba clavado en el
-- codigo como "no trabaja", asi que un salon que abre domingo no podia
-- capturarse, no habia forma de dar un horario distinto a cada dia, y no
-- existia el concepto de dia de descanso -que es lo que evita que un dia
-- libre cuente como falta-.
--
-- Migracion ADITIVA: una columna nueva. Las cuatro viejas se quedan como
-- estan, sin leerse, hasta que se compruebe que el horario nuevo funciona.
--
-- El horario existente se copia al formato nuevo: lunes a viernes de las
-- columnas de semana, sabado de las del sabado, domingo como descanso. Lo que
-- no sea una hora valida -"0", basura suelta- queda vacio para recapturarse,
-- en vez de arrastrarse al formato nuevo.
--
-- Aplicar:
--
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_employee_work_schedule.sql
--   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_employee_work_schedule.sql --aplicar
--
-- Despues: npx prisma generate

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "workSchedule" JSONB;

WITH limpio AS (
  SELECT
    "id",
    CASE WHEN "workScheduleStartWeekday"  ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
         THEN lpad("workScheduleStartWeekday", 5, '0') ELSE '' END AS ent_sem,
    CASE WHEN "workScheduleEndWeekday"    ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
         THEN lpad("workScheduleEndWeekday", 5, '0') ELSE '' END AS sal_sem,
    CASE WHEN "workScheduleStartSaturday" ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
         THEN lpad("workScheduleStartSaturday", 5, '0') ELSE '' END AS ent_sab,
    CASE WHEN "workScheduleEndSaturday"   ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
         THEN lpad("workScheduleEndSaturday", 5, '0') ELSE '' END AS sal_sab
  FROM "Employee"
),
armado AS (
  SELECT
    "id",
    jsonb_build_object('trabaja', false, 'entrada', '', 'salida', '') AS domingo,
    jsonb_build_object(
      'trabaja', (ent_sem <> '' AND sal_sem <> ''),
      'entrada', ent_sem,
      'salida',  sal_sem
    ) AS semana,
    jsonb_build_object(
      'trabaja', (ent_sab <> '' AND sal_sab <> ''),
      'entrada', ent_sab,
      'salida',  sal_sab
    ) AS sabado
  FROM limpio
)
UPDATE "Employee" e
SET "workSchedule" = jsonb_build_array(
  a.domingo, a.semana, a.semana, a.semana, a.semana, a.semana, a.sabado
)
FROM armado a
WHERE e."id" = a."id" AND e."workSchedule" IS NULL;

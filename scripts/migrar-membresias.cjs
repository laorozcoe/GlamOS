/* eslint-disable no-console */
/**
 * Migración: identidad global + Employee como membresía.
 *
 *   node scripts/migrar-membresias.cjs            <- simulación (no escribe)
 *   node scripts/migrar-membresias.cjs --apply    <- aplica de verdad
 *
 * Qué hace, en una sola transacción:
 *
 *   1. Respalda "User" y "Employee" en _bak_user / _bak_employee.
 *   2. Agrega Employee.role, Employee.bookable, session.businessId,
 *      session.role.
 *   3. Copia User.role a la membresía correspondiente.
 *   4. Crea la membresía que falta para cada usuario que no tenía fila en
 *      Employee (los que se dieron de alta sin nómina). Van con bookable=false
 *      para que no aparezcan en la agenda, que es como se comportaban antes.
 *   5. Fusiona los usuarios que comparten correo en un solo User: repunta sus
 *      membresías y sus cuentas de acceso, y borra los sobrantes.
 *   6. Quita User.businessId y User.role, y pone el correo único global.
 *   7. Borra las sesiones abiertas: ahora la sesión va atada a un salón, así
 *      que todos vuelven a iniciar sesión una vez.
 *
 * Usa SQL directo, no el cliente tipado, para poder leer las columnas viejas
 * aunque schema.prisma ya esté en su forma final.
 *
 * Para revertir: las tablas _bak_user y _bak_employee tienen el estado previo.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

class DryRun extends Error {}

const log = (...a) => console.log(...a);

async function columnExists(tx, table, column) {
  const rows = await tx.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    table,
    column
  );
  return rows.length > 0;
}

async function run(tx) {
  // ---------------------------------------------------------------- 0. estado
  const hasUserBusinessId = await columnExists(tx, 'User', 'businessId');
  const hasUserRole = await columnExists(tx, 'User', 'role');

  if (!hasUserBusinessId && !hasUserRole) {
    log('La migración ya se aplicó: User no tiene businessId ni role. Nada que hacer.');
    return;
  }

  const [{ count: usuarios }] = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "User"');
  const [{ count: membresias }] = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Employee"');
  log(`Estado inicial: ${usuarios} usuarios, ${membresias} membresías.\n`);

  // ---------------------------------------------------------------- 1. respaldo
  await tx.$executeRawUnsafe('DROP TABLE IF EXISTS _bak_user');
  await tx.$executeRawUnsafe('DROP TABLE IF EXISTS _bak_employee');
  await tx.$executeRawUnsafe('CREATE TABLE _bak_user AS SELECT * FROM "User"');
  await tx.$executeRawUnsafe('CREATE TABLE _bak_employee AS SELECT * FROM "Employee"');
  log('1. Respaldo hecho en _bak_user y _bak_employee.');

  // ---------------------------------------------------------------- 2. columnas
  await tx.$executeRawUnsafe(
    `ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "role" "Role" NOT NULL DEFAULT 'RECEPTION'`
  );
  await tx.$executeRawUnsafe(
    'ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "bookable" BOOLEAN NOT NULL DEFAULT true'
  );
  await tx.$executeRawUnsafe('ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "businessId" TEXT');
  await tx.$executeRawUnsafe('ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "role" TEXT');
  log('2. Columnas nuevas agregadas.');

  // ---------------------------------------------------------------- 3. rol
  const rolesCopiados = await tx.$executeRawUnsafe(`
    UPDATE "Employee" e
       SET "role" = u."role"
      FROM "User" u
     WHERE e."userId" = u."id"
  `);
  log(`3. Rol copiado a ${rolesCopiados} membresías.`);

  // ------------------------------------------------- 4. membresías faltantes
  const faltantes = await tx.$queryRawUnsafe(`
    SELECT u."id", u."businessId", u."role"::text AS role, u."name", u."email"
      FROM "User" u
     WHERE NOT EXISTS (
       SELECT 1 FROM "Employee" e
        WHERE e."userId" = u."id" AND e."businessId" = u."businessId"
     )
  `);

  for (const u of faltantes) {
    await tx.$executeRawUnsafe(
      `INSERT INTO "Employee" ("id","businessId","userId","role","bookable","commission","baseSalary","rating","active","createdAt")
       VALUES (gen_random_uuid()::text, $1, $2, $3::"Role", false, 0, 0, 0, true, NOW())`,
      u.businessId,
      u.id,
      u.role
    );
    log(`   + membresía para ${u.email || u.name} (${u.role}, bookable=false)`);
  }
  log(`4. ${faltantes.length} membresías creadas para usuarios que no tenían.`);

  // ------------------------------------------------------ 5. fusión por correo
  const duplicados = await tx.$queryRawUnsafe(`
    SELECT lower("email") AS email, COUNT(*)::int AS n
      FROM "User"
     WHERE "email" IS NOT NULL AND "email" <> ''
     GROUP BY lower("email")
    HAVING COUNT(*) > 1
  `);

  let membresiasRepuntadas = 0;
  let usuariosBorrados = 0;
  let cuentasDescartadas = 0;
  let historialMovido = 0;

  for (const dup of duplicados) {
    // Sobrevive el más antiguo: es el que tiene más historia asociada.
    const users = await tx.$queryRawUnsafe(
      `SELECT "id","businessId","createdAt" FROM "User"
        WHERE lower("email") = $1 ORDER BY "createdAt" ASC, "id" ASC`,
      dup.email
    );
    const [superviviente, ...sobrantes] = users;
    log(`   ${dup.email}: ${dup.n} usuarios -> se conserva ${superviviente.id}`);

    for (const viejo of sobrantes) {
      // Caso delicado: la misma persona duplicada DENTRO de un mismo salón.
      // La unique (businessId, userId) no admite las dos membresías, pero
      // borrar la sobrante a secas falla por clave foránea -de ella cuelgan
      // ventas, citas y asistencias- y, si no fallara, se llevaría por delante
      // ese historial. Se fusionan: la historia se mueve a la membresía que
      // sobrevive y solo entonces se borra la vacía.
      const colisiones = await tx.$queryRawUnsafe(
        `SELECT viejo."id" AS origen, nuevo."id" AS destino
           FROM "Employee" viejo
           JOIN "Employee" nuevo
             ON nuevo."businessId" = viejo."businessId" AND nuevo."userId" = $1
          WHERE viejo."userId" = $2`,
        superviviente.id,
        viejo.id
      );

      for (const c of colisiones) {
        // Las asistencias son únicas por (salón, membresía, día). Las del
        // origen que choquen con una del destino se descartan; son el mismo
        // día de la misma persona.
        const descartadas = await tx.$executeRawUnsafe(
          `DELETE FROM "Attendance" AS a
            WHERE a."employeeId" = $1
              AND EXISTS (
                SELECT 1 FROM "Attendance" b
                 WHERE b."employeeId" = $2
                   AND b."businessId" = a."businessId"
                   AND b."date" = a."date")`,
          c.origen,
          c.destino
        );

        let movidos = 0;
        for (const [tabla, col] of [
          ['Appointment', 'employeeId'],
          ['Attendance', 'employeeId'],
          ['Sale', 'employeeId'],
          ['Review', 'employeeId'],
          ['Client', 'employeeId'],
          ['AppointmentServiceRequest', 'employeeRequesterId'],
        ]) {
          movidos += await tx.$executeRawUnsafe(
            `UPDATE "${tabla}" SET "${col}" = $1 WHERE "${col}" = $2`,
            c.destino,
            c.origen
          );
        }

        await tx.$executeRawUnsafe('DELETE FROM "Employee" WHERE "id" = $1', c.origen);
        historialMovido += movidos;
        log(
          `      ! duplicado dentro del mismo salón: se fusionan las dos membresías ` +
            `(${movidos} registros de historial movidos` +
            (descartadas ? `, ${descartadas} asistencias repetidas descartadas` : '') +
            `)`
        );
      }

      membresiasRepuntadas += await tx.$executeRawUnsafe(
        `UPDATE "Employee" SET "userId" = $1 WHERE "userId" = $2`,
        superviviente.id,
        viejo.id
      );

      // Las contraseñas de los usuarios sobrantes se pierden: queda la del
      // superviviente. Se reporta para que sepas a quién avisar.
      const cuentas = await tx.$queryRawUnsafe(
        `SELECT "id" FROM "account" WHERE "userId" = $1`,
        viejo.id
      );
      cuentasDescartadas += cuentas.length;

      await tx.$executeRawUnsafe('DELETE FROM "account" WHERE "userId" = $1', viejo.id);
      await tx.$executeRawUnsafe('DELETE FROM "session" WHERE "userId" = $1', viejo.id);
      await tx.$executeRawUnsafe('DELETE FROM "User" WHERE "id" = $1', viejo.id);
      usuariosBorrados += 1;
    }
  }
  log(
    `5. ${duplicados.length} correos fusionados: ${membresiasRepuntadas} membresías repuntadas, ` +
      `${historialMovido} registros de historial movidos, ` +
      `${usuariosBorrados} usuarios sobrantes borrados, ${cuentasDescartadas} contraseñas descartadas.`
  );

  // ------------------------------------------------------------ 6. constraints
  await tx.$executeRawUnsafe('ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_businessId_email_username_key"');
  await tx.$executeRawUnsafe('DROP INDEX IF EXISTS "User_businessId_email_username_key"');
  await tx.$executeRawUnsafe('ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_businessId_fkey"');
  await tx.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "businessId"');
  await tx.$executeRawUnsafe('ALTER TABLE "User" DROP COLUMN IF EXISTS "role"');
  await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User" ("email")');

  await tx.$executeRawUnsafe('ALTER TABLE "Employee" DROP CONSTRAINT IF EXISTS "Employee_userId_key"');
  await tx.$executeRawUnsafe('DROP INDEX IF EXISTS "Employee_userId_key"');
  await tx.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Employee_businessId_userId_key" ON "Employee" ("businessId","userId")'
  );
  log('6. User sin businessId ni role; correo único global; membresía única por salón.');

  // -------------------------------------------------------------- 7. sesiones
  const sesiones = await tx.$executeRawUnsafe('DELETE FROM "session"');
  log(`7. ${sesiones} sesiones cerradas: la sesión ahora va atada a un salón.`);

  const [{ count: usuariosFin }] = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "User"');
  const [{ count: membresiasFin }] = await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Employee"');
  log(`\nEstado final: ${usuariosFin} usuarios, ${membresiasFin} membresías.`);
}

async function main() {
  log(APPLY ? '\n=== APLICANDO ===\n' : '\n=== SIMULACIÓN (nada se guarda) — usa --apply para aplicar ===\n');

  try {
    await prisma.$transaction(
      async (tx) => {
        await run(tx);
        if (!APPLY) throw new DryRun();
      },
      { timeout: 120000, maxWait: 20000 }
    );
    log('\nListo. Ahora corre:  npx prisma db push  y  npx prisma generate');
  } catch (e) {
    if (e instanceof DryRun) {
      log('\nSimulación terminada, no se escribió nada. Repite con --apply cuando estés conforme.');
      return;
    }
    throw e;
  }
}

main()
  .catch((e) => {
    console.error('\nFALLÓ, no se aplicó nada (la transacción se revirtió):\n', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

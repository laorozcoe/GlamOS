/* eslint-disable no-console */
/**
 * Aplica un archivo .sql de prisma/manual contra la base de datos.
 *
 *   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_attendance_source_and_tolerance.sql
 *   node scripts/aplicar-sql.cjs prisma/manual/20260906_add_attendance_source_and_tolerance.sql --aplicar
 *
 * Sin --aplicar solo imprime lo que correria y verifica la conexion.
 *
 * Usa `pg` directo y no Prisma: asi funciona aunque el cliente generado
 * todavia no conozca las columnas que este archivo esta creando -que es
 * justamente el caso cada vez que se aplica una migracion nueva-.
 *
 * Todo el archivo va dentro de UNA transaccion: si un statement falla, no
 * queda nada a medias. Si el .sql usa CREATE INDEX CONCURRENTLY, que no puede
 * ir en transaccion, aplicalo con psql y no con este script.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const archivo = process.argv[2];
const APLICAR = process.argv.includes('--aplicar') || process.argv.includes('--apply');

if (!archivo) {
  console.log('Uso: node scripts/aplicar-sql.cjs <archivo.sql> [--aplicar]');
  process.exit(1);
}

const rutaSql = path.resolve(process.cwd(), archivo);
if (!fs.existsSync(rutaSql)) {
  console.error(`No encontre el archivo: ${rutaSql}`);
  process.exit(1);
}

const sql = fs.readFileSync(rutaSql, 'utf8');

if (/CONCURRENTLY/i.test(sql)) {
  console.error(
    'Este archivo usa CREATE INDEX CONCURRENTLY, que no puede correr dentro de\n' +
    'una transaccion. Aplicalo con psql:\n\n' +
    `  psql "$DATABASE_URL_UNPOOLED" -f ${archivo}\n`
  );
  process.exit(1);
}

function connectionString() {
  const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const m =
    env.match(/^DATABASE_URL_UNPOOLED\s*=\s*"?([^"\n\r]+)"?/m) ||
    env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m);
  if (!m) throw new Error('No encontre DATABASE_URL en .env');
  return m[1];
}

async function main() {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();

  const { rows } = await client.query('SELECT current_database() AS db');
  console.log(`\nBase de datos: ${rows[0].db}`);
  console.log(`Archivo:       ${archivo}`);
  console.log(APLICAR ? '\n=== APLICANDO DE VERDAD ===\n' : '\n=== SIMULACION (sin --aplicar no se escribe nada) ===\n');

  console.log(sql.split('\n').filter((l) => l.trim() && !l.trim().startsWith('--')).join('\n'));

  if (!APLICAR) {
    console.log('\nNada se aplico. Repite el comando con --aplicar cuando estes listo.');
    await client.end();
    return;
  }

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('\nListo. Ahora corre:  npx prisma generate');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\nFallo, no se aplico nada:\n', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

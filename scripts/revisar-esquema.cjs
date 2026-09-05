/* eslint-disable no-console */
/**
 * Comprueba que la base de datos tenga todo lo que el codigo espera.
 *
 *   node scripts/revisar-esquema.cjs
 *
 * Solo lee. Sirve antes de un deploy: `prisma generate` lee el schema, no la
 * base, asi que un `tsc` limpio NO prueba que las migraciones se aplicaron.
 * Ese desajuste -cliente nuevo contra base vieja- es lo que rompio el login
 * la vez que se genero antes de aplicar.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Lo que agrego cada migracion manual, en orden.
const ESPERADO = [
  { archivo: '20260906_add_attendance_source_and_tolerance.sql', fase: 'Fase 1 · retardos',
    columnas: [['Business', 'lateToleranceMinutes'], ['Attendance', 'source'], ['Attendance', 'sourceRef']],
    tablas: [] },
  { archivo: '20260906_add_bonus_rules.sql', fase: 'Fase 2 · catalogo de bonos',
    columnas: [], tablas: ['BonusRule', 'BonusAward'] },
  { archivo: '20260906_add_employee_in_payroll.sql', fase: 'Fase 6 · nomina vs agenda',
    columnas: [['Employee', 'inPayroll']], tablas: [] },
  { archivo: '20260906_add_payroll_close.sql', fase: 'Fase 7 · cerrar nomina',
    columnas: [], tablas: ['PayrollPeriod', 'PayrollLine', 'PayrollLineBonus'] },
  { archivo: '20260906_add_employee_work_schedule.sql', fase: 'Horario por dia',
    columnas: [['Employee', 'workSchedule']], tablas: [] },
];

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

  const { rows: cols } = await client.query(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`
  );
  const { rows: tabs } = await client.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );

  const hayColumna = (t, c) => cols.some((r) => r.table_name === t && r.column_name === c);
  const hayTabla = (t) => tabs.some((r) => r.table_name === t);

  const { rows: db } = await client.query('SELECT current_database() AS db');
  console.log(`\nBase de datos: ${db[0].db}\n`);

  let faltan = 0;

  for (const m of ESPERADO) {
    const pendientes = [
      ...m.tablas.filter((t) => !hayTabla(t)).map((t) => `tabla ${t}`),
      ...m.columnas.filter(([t, c]) => !hayColumna(t, c)).map(([t, c]) => `${t}.${c}`),
    ];

    if (pendientes.length === 0) {
      console.log(`  OK       ${m.fase}`);
    } else {
      faltan++;
      console.log(`  FALTA    ${m.fase}`);
      console.log(`           no encontre: ${pendientes.join(', ')}`);
      console.log(`           node scripts/aplicar-sql.cjs prisma/manual/${m.archivo} --aplicar`);
    }
  }

  console.log(
    faltan === 0
      ? '\nLa base tiene todo lo que el codigo espera.\n'
      : `\n${faltan} migracion(es) sin aplicar. Aplicalas ANTES de publicar el codigo.\n`
  );

  await client.end();
  process.exitCode = faltan === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

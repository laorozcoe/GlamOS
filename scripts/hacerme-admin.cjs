/* eslint-disable no-console */
/**
 * Diagnostica y arregla el rol de un usuario en un salón.
 *
 *   node scripts/hacerme-admin.cjs laorozcoe@gmail.com demo-glamos
 *   node scripts/hacerme-admin.cjs laorozcoe@gmail.com demo-glamos --aplicar
 *
 * Sin --aplicar solo informa.
 *
 * Detecta solo si la migración de membresías ya corrió y escribe en el sitio
 * correcto: User.role si todavía no, Employee.role si ya. Usa `pg` directo y
 * no Prisma, para funcionar en cualquiera de los dos estados del esquema.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const [email, slug] = process.argv.slice(2);
const APLICAR = process.argv.includes('--aplicar');

if (!email || !slug) {
  console.log('Uso: node scripts/hacerme-admin.cjs <correo> <slug-del-salon> [--aplicar]');
  process.exit(1);
}

function connectionString() {
  const env = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
  const m =
    env.match(/^DATABASE_URL_UNPOOLED\s*=\s*"?([^"\n\r]+)"?/m) ||
    env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m);
  if (!m) throw new Error('No encontré DATABASE_URL en .env');
  return m[1];
}

async function main() {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();

  try {
    const { rows: cols } = await client.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name IN ('User','Employee')
          AND column_name IN ('role','businessId','bookable')`
    );
    const nombres = cols.map((c) => c.column_name);
    const migrado = !nombres.includes('businessId') || nombres.includes('bookable');

    console.log(`\nEsquema: ${migrado ? 'YA migrado (el rol vive en Employee)' : 'SIN migrar (el rol vive en User)'}\n`);

    const { rows: negocios } = await client.query(
      'SELECT id, name, slug FROM "Business" WHERE slug = $1',
      [slug]
    );
    if (!negocios.length) {
      console.log(`No existe ningún salón con slug "${slug}". Salones disponibles:`);
      const { rows: todos } = await client.query('SELECT slug, name FROM "Business" ORDER BY "createdAt"');
      console.table(todos);
      return;
    }
    const negocio = negocios[0];
    console.log(`Salón: ${negocio.name} (${negocio.slug})`);

    if (!migrado) {
      const { rows: usuarios } = await client.query(
        'SELECT u.id, u.email, u.role, u."businessId", b.slug AS salon ' +
          'FROM "User" u LEFT JOIN "Business" b ON b.id = u."businessId" WHERE u.email = $1',
        [email]
      );
      if (!usuarios.length) return console.log(`\nNo hay ningún usuario con el correo ${email}.`);
      console.table(usuarios.map((u) => ({ id: u.id, rol: u.role, salon: u.salon })));

      const enEsteSalon = usuarios.find((u) => u.businessId === negocio.id);
      if (!enEsteSalon) {
        console.log(`\n⚠  Ese correo NO pertenece a "${slug}". Está en: ${usuarios.map((u) => u.salon).join(', ')}`);
        console.log('   Cambiarle el rol no serviría: la app resuelve el salón por el host.');
        return;
      }
      if (enEsteSalon.role === 'ADMIN') return console.log('\nYa es ADMIN. No hay nada que cambiar.');

      if (!APLICAR) return console.log(`\nSería: ${enEsteSalon.role} -> ADMIN. Repite con --aplicar.`);

      await client.query('UPDATE "User" SET role = $1 WHERE id = $2', ['ADMIN', enEsteSalon.id]);
      console.log(`\n✓ ${email} ahora es ADMIN en ${slug}. Cierra sesión y vuelve a entrar.`);
      return;
    }

    // --- esquema ya migrado: el rol es de la membresía -----------------------
    const { rows: membresias } = await client.query(
      `SELECT e.id, e.role, e.active, u.email
         FROM "Employee" e JOIN "User" u ON u.id = e."userId"
        WHERE u.email = $1 AND e."businessId" = $2`,
      [email, negocio.id]
    );

    if (!membresias.length) {
      console.log(`\n⚠  ${email} no tiene membresía en "${slug}", por eso no ve nada.`);
      console.log('   Dale de alta desde la pantalla de Empleados de ese salón, con ese mismo correo.');
      return;
    }

    console.table(membresias.map((m) => ({ membresia: m.id, rol: m.role, activa: m.active })));
    if (membresias[0].role === 'ADMIN' && membresias[0].active) {
      return console.log('\nYa es ADMIN activo. No hay nada que cambiar.');
    }
    if (!APLICAR) return console.log(`\nSería: ${membresias[0].role} -> ADMIN (y activa). Repite con --aplicar.`);

    await client.query('UPDATE "Employee" SET role = $1, active = true WHERE id = $2', ['ADMIN', membresias[0].id]);
    console.log(`\n✓ ${email} ahora es ADMIN en ${slug}. Cierra sesión y vuelve a entrar.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('\nFalló:', e.message);
  process.exitCode = 1;
});

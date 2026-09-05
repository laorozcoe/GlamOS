/* eslint-disable no-console */
/**
 * Que sabe la base sobre una persona: identidad, credencial y membresias.
 *
 *   node scripts/revisar-usuario.cjs anacglezg@gmail.com
 *
 * Solo lee. Sirve cuando alguien no puede entrar y hay que distinguir entre
 * "no existe", "el correo esta escrito distinto", "no tiene credencial" y
 * "no pertenece a ese salon".
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const correo = process.argv[2];
if (!correo) {
  console.log('Uso: node scripts/revisar-usuario.cjs <correo>');
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

  // Sin distinguir mayusculas: si aparece asi pero no exacto, ese es el problema.
  const { rows: usuarios } = await client.query(
    `SELECT id, name, "lastName", email, username, active FROM "User" WHERE lower(email) = lower($1)`,
    [correo]
  );

  if (usuarios.length === 0) {
    console.log(`\nNo existe ningun usuario con el correo ${correo}, ni escrito de otra forma.\n`);
    await client.end();
    return;
  }

  for (const u of usuarios) {
    const exacto = u.email === correo;
    console.log(`\n${u.name} ${u.lastName}`);
    console.log(`  correo en la base : ${u.email}${exacto ? '' : '   <-- NO coincide exacto con lo que escribiste'}`);
    console.log(`  usuario           : ${u.username}`);
    console.log(`  activo            : ${u.active ? 'si' : 'NO'}`);

    const { rows: cuentas } = await client.query(
      `SELECT "providerId", ("password" IS NOT NULL) AS tiene_pass FROM "account" WHERE "userId" = $1`,
      [u.id]
    );
    if (cuentas.length === 0) {
      console.log('  credencial        : NINGUNA  <-- sin fila en account no puede entrar con contrasena');
    } else {
      for (const c of cuentas) {
        console.log(`  credencial        : ${c.providerId}${c.tiene_pass ? ' (con contrasena)' : '  <-- SIN contrasena'}`);
      }
    }

    const { rows: membresias } = await client.query(
      `SELECT b.slug, b.name, e.role, e.active
         FROM "Employee" e JOIN "Business" b ON b.id = e."businessId"
        WHERE e."userId" = $1
        ORDER BY b.slug`,
      [u.id]
    );
    if (membresias.length === 0) {
      console.log('  salones           : NINGUNO  <-- no pertenece a ningun salon');
    } else {
      console.log('  salones           :');
      for (const m of membresias) {
        console.log(`      ${m.slug.padEnd(16)} ${String(m.role).padEnd(10)} ${m.active ? 'activa' : 'INACTIVA'}`);
      }
    }
  }

  console.log('');
  await client.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

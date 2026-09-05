/* eslint-disable no-console */
/**
 * Cambia la contraseña de un usuario.
 *
 *   node scripts/cambiar-password.cjs correo@ejemplo.com "NuevaClave123"
 *
 * Escribe en los DOS sitios donde vive: User.password y la cuenta de
 * credenciales de Better Auth (account.password). Si solo se actualiza uno, el
 * login sigue usando el otro y parece que el cambio no surtió efecto.
 *
 * Hace falta sobre todo después de fusionar usuarios: cuando dos filas
 * comparten correo sobrevive la contraseña de la más antigua, y la otra se
 * descarta.
 *
 * Usa `pg` y `bcrypt` directos, para no depender del estado de prisma generate.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const [email, nueva] = process.argv.slice(2);

if (!email || !nueva) {
  console.log('Uso: node scripts/cambiar-password.cjs <correo> "<nueva contraseña>"');
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
    const { rows: usuarios } = await client.query(
      'SELECT id, email, name, "lastName" FROM "User" WHERE email = $1',
      [email]
    );

    if (!usuarios.length) {
      console.log(`No hay ningún usuario con el correo ${email}.`);
      return;
    }
    if (usuarios.length > 1) {
      console.log(`⚠  Hay ${usuarios.length} usuarios con ese correo. Se cambiará en todos.`);
    }

    const hash = await bcrypt.hash(nueva, 10);

    for (const u of usuarios) {
      await client.query('UPDATE "User" SET password = $1 WHERE id = $2', [hash, u.id]);

      const { rowCount } = await client.query(
        `UPDATE "account" SET password = $1
          WHERE "userId" = $2 AND "providerId" = 'credential'`,
        [hash, u.id]
      );

      if (rowCount === 0) {
        // Sin cuenta de credenciales no hay forma de entrar: se crea.
        await client.query(
          `INSERT INTO "account" ("id","accountId","providerId","userId","password","createdAt","updatedAt")
           VALUES (gen_random_uuid()::text, $1, 'credential', $2, $3, NOW(), NOW())`,
          [u.email, u.id, hash]
        );
        console.log(`   (no tenía cuenta de credenciales; se creó)`);
      }

      console.log(`✓ ${u.name} ${u.lastName} <${u.email}> — contraseña actualizada`);
    }

    console.log('\nCierra sesión y vuelve a entrar.');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('\nFalló:', e.message);
  process.exitCode = 1;
});

/**
 * Diagnóstico de multi-tenancy.
 *
 *   node get-businesses.cjs
 *
 * Imprime los negocios y a cuál pertenece cada usuario. Sirve para resolver el
 * error "No autorizado para este negocio": el negocio se resuelve por el HOST
 * (en localhost, por DEV_BUSINESS_SLUG), no por quién inició sesión, así que
 * una sesión de otro negocio choca contra el guard de requireSession().
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const devSlug = process.env.DEV_BUSINESS_SLUG || '(sin definir -> se usa el default del código)';
  console.log('\nDEV_BUSINESS_SLUG =', devSlug);
  console.log('En localhost, ESE es el negocio al que se conecta la app.\n');

  const businesses = await prisma.business.findMany({
    select: { id: true, name: true, slug: true, active: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('--- Negocios ---');
  console.table(businesses);

  const users = await prisma.user.findMany({
    select: {
      email: true,
      username: true,
      role: true,
      active: true,
      business: { select: { slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('--- Usuarios ---');
  console.table(
    users.map((u) => ({
      email: u.email,
      username: u.username,
      role: u.role,
      active: u.active,
      negocio: u.business?.slug,
    }))
  );

  // El mismo correo en dos negocios hace ambiguo el login: Better Auth
  // resuelve el usuario con un findFirst por email.
  const byEmail = new Map();
  for (const u of users) {
    if (!u.email) continue;
    byEmail.set(u.email, (byEmail.get(u.email) || 0) + 1);
  }
  const duplicados = [...byEmail.entries()].filter(([, n]) => n > 1);
  if (duplicados.length) {
    console.log('\n⚠  Correos repetidos en más de un negocio (el login los rechaza):');
    duplicados.forEach(([email, n]) => console.log(`   ${email} -> ${n} usuarios`));
  }

  console.log(
    '\nPara trabajar en local: pon DEV_BUSINESS_SLUG=<slug> en .env con el negocio\n' +
    'de tu usuario, reinicia `npm run dev` y vuelve a iniciar sesión.\n'
  );
}

main().finally(() => prisma.$disconnect());

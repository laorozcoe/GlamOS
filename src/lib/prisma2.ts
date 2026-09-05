import { PrismaClient } from "@prisma/client";

/**
 * Cliente de Prisma compartido.
 *
 * En desarrollo, Next recarga los módulos en cada cambio. Sin este singleton
 * cada recarga abriría un pool nuevo contra Postgres y acabaría agotando las
 * conexiones. En producción el módulo se evalúa una sola vez.
 *
 * Está en TypeScript a propósito: mientras fue un `.js`, `prisma` llegaba
 * tipado como `any` a TODO el código, y ninguna consulta se verificaba. Un
 * `select` de una columna inexistente o un `where` mal escrito pasaban el
 * typecheck y fallaban en runtime.
 */
const prismaClientSingleton = () => new PrismaClient();

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

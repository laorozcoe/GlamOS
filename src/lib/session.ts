import "server-only";

import { headers } from "next/headers";
import type { Business } from "@prisma/client";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";

export type AppRole = "ADMIN" | "RECEPTION" | "EMPLOYEE";

export type AuthContext = {
  userId: string;
  role: AppRole;
  business: Business;
};

/**
 * Error de autorizacion. Se distingue de un error de negocio para poder
 * mapearlo a un 401/403 desde la UI si hiciera falta.
 */
export class AuthorizationError extends Error {
  constructor(message = "No autorizado") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Devuelve el contexto de seguridad de la peticion actual.
 *
 * Los Server Actions son endpoints HTTP publicos: cualquiera que conozca el
 * ID de la accion puede invocarla desde cualquier ruta. El middleware
 * (proxy.ts) solo protege la navegacion entre paginas, no las invocaciones de
 * acciones, asi que la validacion tiene que vivir aqui.
 *
 * Valida tres cosas:
 *   1. Que exista una sesion.
 *   2. Que el negocio del host se pueda resolver.
 *   3. Que el usuario de la sesion pertenezca a ese negocio (anti cross-tenant).
 *
 * @param roles Si se pasa, el rol del usuario debe estar en la lista.
 */
export async function requireSession(roles?: AppRole[]): Promise<AuthContext> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    throw new AuthorizationError("No autenticado");
  }

  const business = await getBusiness();
  if (!business) {
    throw new AuthorizationError("No se pudo identificar el negocio");
  }

  // businessId viaja en la sesion (additionalFields en auth.ts). Se consulta a
  // la base como respaldo por si la sesion se emitio antes de ese cambio.
  let userBusinessId = (session.user as { businessId?: string }).businessId;
  let role = (session.user as { role?: string }).role as AppRole | undefined;

  if (!userBusinessId || !role) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { businessId: true, role: true, active: true },
    });

    if (!dbUser || !dbUser.active) {
      throw new AuthorizationError("Usuario inactivo o inexistente");
    }

    userBusinessId = userBusinessId || dbUser.businessId;
    role = role || (dbUser.role as AppRole);
  }

  if (userBusinessId !== business.id) {
    // Fuera de produccion se dice exactamente que no coincidio. En local el
    // motivo casi siempre es el mismo: el negocio sale del host
    // (DEV_BUSINESS_SLUG en localhost), no de quien inicio sesion, asi que una
    // sesion vieja de otro negocio choca contra el guard.
    if (process.env.NODE_ENV !== "production") {
      throw new AuthorizationError(
        `No autorizado para este negocio. El host resolvio a "${business.slug}" ` +
          `(${business.id}) pero el usuario de la sesion pertenece a ${userBusinessId}. ` +
          `Revisa DEV_BUSINESS_SLUG en .env y vuelve a iniciar sesion.`
      );
    }

    throw new AuthorizationError("No autorizado para este negocio");
  }

  const effectiveRole: AppRole = role ?? "EMPLOYEE";

  if (roles && !roles.includes(effectiveRole)) {
    throw new AuthorizationError("No tienes permisos para esta operacion");
  }

  return { userId: session.user.id, role: effectiveRole, business };
}

/**
 * Reemplazo directo de `getBusiness()` dentro de Server Actions.
 *
 * Devuelve el mismo objeto Business, pero solo despues de validar la sesion y
 * que el usuario pertenezca a ese negocio. Lanza en vez de devolver null.
 */
export async function requireBusiness(roles?: AppRole[]): Promise<Business> {
  const { business } = await requireSession(roles);
  return business;
}

/**
 * Valida un businessId que llega desde el cliente contra el de la sesion.
 * Devuelve el businessId de la sesion, que es el unico en el que se debe
 * confiar.
 */
export async function assertBusinessId(
  candidate?: string | null,
  roles?: AppRole[]
): Promise<string> {
  const { business } = await requireSession(roles);

  if (candidate && candidate !== business.id) {
    throw new AuthorizationError("No autorizado para este negocio");
  }

  return business.id;
}

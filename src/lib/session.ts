import "server-only";

import { headers } from "next/headers";
import type { Business } from "@prisma/client";

import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";

export type AppRole = "ADMIN" | "RECEPTION" | "EMPLOYEE";

export type AuthContext = {
  userId: string;
  /** Id de la membresía (fila de Employee) en este salón. */
  employeeId: string;
  /** Rol DENTRO de este salón. La misma persona puede tener otro en otro. */
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
 * Valida cuatro cosas:
 *   1. Que exista una sesion.
 *   2. Que el negocio del host se pueda resolver.
 *   3. Que el usuario tenga una MEMBRESIA activa en ese negocio.
 *   4. Que el rol de esa membresia este entre los permitidos.
 *
 * La membresia se consulta contra la base y no se toma de la sesion: la
 * sesion lleva una copia sellada al iniciarla, util para el middleware, pero
 * aqui es donde se autoriza y un permiso revocado tiene que surtir efecto de
 * inmediato. Es una lectura por el indice unico (businessId, userId).
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

  const membership = await prisma.employee.findUnique({
    where: {
      businessId_userId: { businessId: business.id, userId: session.user.id },
    },
    select: { id: true, role: true, active: true, user: { select: { active: true } } },
  });

  if (!membership || !membership.active || !membership.user.active) {
    if (process.env.NODE_ENV !== "production") {
      throw new AuthorizationError(
        `El usuario de la sesion no tiene una membresia activa en "${business.slug}". ` +
          `En local el salon sale de DEV_BUSINESS_SLUG: revisalo en .env y vuelve a iniciar sesion.`
      );
    }
    throw new AuthorizationError("No autorizado para este negocio");
  }

  const role = membership.role as AppRole;

  if (roles && !roles.includes(role)) {
    throw new AuthorizationError("No tienes permisos para esta operacion");
  }

  return { userId: session.user.id, employeeId: membership.id, role, business };
}

/**
 * Reemplazo directo de `getBusiness()` dentro de Server Actions.
 *
 * Devuelve el mismo objeto Business, pero solo despues de validar la sesion y
 * que el usuario tenga membresia en ese negocio. Lanza en vez de devolver null.
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

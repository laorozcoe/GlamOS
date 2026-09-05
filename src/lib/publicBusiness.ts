import type { Business } from "@prisma/client";

/**
 * Campos del negocio que NUNCA deben cruzar al cliente.
 *
 * El layout raiz mete el objeto Business en un Client Component
 * (BusinessProvider), asi que todo lo que quede aqui se serializa dentro del
 * payload RSC de cada pagina, incluida /signin, y es legible por cualquiera
 * que abra la URL.
 */
const SECRET_FIELDS = [
  "mpAccessToken",
  "mpWebhookSecret",
  "mpAccounts",
] as const;

export type PublicBusiness = Omit<Business, (typeof SECRET_FIELDS)[number]>;

/**
 * Quita del negocio los secretos de MercadoPago antes de exponerlo al cliente.
 * `mpPublicKey` y `mpStoreId` se conservan: son datos publicos por diseno.
 */
export function toPublicBusiness(business: Business): PublicBusiness;
export function toPublicBusiness(business: null | undefined): null;
export function toPublicBusiness(
  business: Business | null | undefined
): PublicBusiness | null;
export function toPublicBusiness(
  business: Business | null | undefined
): PublicBusiness | null {
  if (!business) return null;

  const {
    mpAccessToken: _mpAccessToken,
    mpWebhookSecret: _mpWebhookSecret,
    mpAccounts: _mpAccounts,
    ...safe
  } = business;

  return safe;
}

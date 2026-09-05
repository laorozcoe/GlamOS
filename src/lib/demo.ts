/**
 * El salón de demostración.
 *
 * El slug vive aquí y en ningún otro sitio del código. Estaba escrito a mano
 * en dos pantallas distintas, así que cambiarlo -por ejemplo cuando el
 * subdominio "demo" resultó estar ocupado- rompía cosas en varios lugares a la
 * vez y en silencio.
 *
 * Este módulo NO es "server-only" a propósito: lo consumen tanto un Server
 * Action como un Client Component.
 */
export const DEMO_SLUG = "demo-glamos";

/** Si un negocio es el sitio de demostración. */
export function isDemoBusiness(business?: { slug?: string | null } | null): boolean {
  return business?.slug === DEMO_SLUG;
}

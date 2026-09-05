"use server";

import { requireBusiness } from "@/lib/session";
import { calcularNomina } from "@/lib/nomina";

/**
 * La nomina de la semana que contiene la fecha recibida.
 *
 * El rango ya no llega desde la pantalla. Antes el cliente calculaba la
 * semana con `getDate() - getDay()`, o sea siempre de domingo a sabado, sin
 * importar el dia de corte que el salon hubiera elegido en Configuracion. Ese
 * corte lo decide ahora el servidor, que es donde vive el dato.
 */
export async function getPayrollData(referenceDateISO: string) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!business) throw new Error("No business found");

  return calcularNomina(business.id, new Date(referenceDateISO));
}

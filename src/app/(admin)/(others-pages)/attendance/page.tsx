import { redirect } from "next/navigation";

/**
 * La asistencia se mudo a /payroll/asistencia, junto a la nomina que produce.
 * Esta ruta se queda como redireccion: hay pestanas del navegador y accesos
 * directos guardados apuntando aqui.
 */
export default function AttendanceRedirect() {
  redirect("/payroll/asistencia");
}

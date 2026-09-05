/**
 * El periodo de nomina de un salon.
 *
 * El dia de corte se captura en Configuracion y se guarda en
 * `Business.weekStartDay` (0 = domingo). Hasta ahora nadie lo leia: la nomina
 * hacia `getDate() - getDay()`, o sea siempre domingo, sin importar lo que el
 * salon hubiera elegido.
 *
 * Todo lo que corte por semana -nomina, bonos, metas- debe pasar por aqui
 * para que el corte sea el mismo en todas las pantallas.
 */

/** Fecha local a "YYYY-MM-DD", sin pasar por UTC. */
export function aTextoFecha(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" a Date local a medianoche. Evita el corrimiento de `new Date("2026-09-06")`. */
export function deTextoFecha(texto: string): Date {
  const [y, m, d] = texto.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * La semana que contiene `fecha`, empezando en `diaDeCorte` (0 = domingo).
 *
 * `inicio` queda a las 00:00:00 y `fin` a las 23:59:59.999 del septimo dia,
 * de modo que sirven directo como `gte` / `lte` contra un campo de fecha-hora.
 */
export function rangoSemana(fecha: Date, diaDeCorte: number) {
  const corte = ((diaDeCorte % 7) + 7) % 7;

  const inicio = new Date(fecha);
  inicio.setHours(0, 0, 0, 0);
  // Cuantos dias hay que retroceder para llegar al dia de corte.
  const retroceso = (inicio.getDay() - corte + 7) % 7;
  inicio.setDate(inicio.getDate() - retroceso);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  fin.setHours(23, 59, 59, 999);

  return { inicio, fin };
}

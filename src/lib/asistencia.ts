/**
 * Reglas de asistencia compartidas por el servidor y la pantalla.
 *
 * No lleva `server-only` a proposito: la tabla necesita pintar el retardo
 * mientras se escribe la hora, antes de guardar, y el servidor necesita
 * decidir el mismo estado al guardar. Una sola definicion evita que la
 * pantalla y la base opinen distinto sobre el mismo dia.
 */

/** Convierte "09:15" en minutos desde medianoche. Devuelve null si no es una hora. */
export function aMinutos(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Un dia es retardo cuando la hora capturada pasa de la programada mas la
 * tolerancia del salon. Sin horario programado no hay contra que comparar,
 * asi que no hay retardo: no se penaliza a quien no tiene horario cargado.
 */
export function esRetardo(
  horaEntrada: string | null | undefined,
  horaProgramada: string | null | undefined,
  toleranciaMinutos: number
): boolean {
  const entrada = aMinutos(horaEntrada);
  const programada = aMinutos(horaProgramada);
  if (entrada === null || programada === null) return false;
  return entrada > programada + Math.max(0, toleranciaMinutos);
}

/** Minutos de retardo, para mostrarlos. 0 si llego dentro de la tolerancia. */
export function minutosDeRetardo(
  horaEntrada: string | null | undefined,
  horaProgramada: string | null | undefined,
  toleranciaMinutos: number
): number {
  if (!esRetardo(horaEntrada, horaProgramada, toleranciaMinutos)) return 0;
  return (aMinutos(horaEntrada) as number) - (aMinutos(horaProgramada) as number);
}

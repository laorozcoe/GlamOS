/**
 * El horario semanal de un empleado.
 *
 * Antes eran cuatro columnas -entrada y salida de lunes a viernes, mas las
 * del sabado- y el domingo estaba clavado en el codigo como "no trabaja". Eso
 * dejaba fuera tres casos normales en un salon: horario distinto cada dia,
 * abrir en domingo, y el dia de descanso de una persona, que es lo que evita
 * que su dia libre se cuente como falta.
 *
 * No lleva `server-only`: lo usan la pantalla de empleados, la de asistencia
 * y el calculo de la nomina.
 */

export type DiaHorario = {
  trabaja: boolean;
  /** "09:00", o cadena vacia. */
  entrada: string;
  salida: string;
};

/** Siete entradas. El indice es el dia de la semana de JS: 0 = domingo. */
export type Horario = DiaHorario[];

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** Dias en el orden en que se leen, empezando en lunes y con domingo al final. */
export const ORDEN_CAPTURA = [1, 2, 3, 4, 5, 6, 0] as const;

const HORA = /^([01]?\d|2[0-3]):[0-5]\d$/;

/** "9:00" y "09:00" son validas; "0", "" y "25:00" no. */
export function esHoraValida(valor: unknown): valor is string {
  return typeof valor === "string" && HORA.test(valor.trim());
}

/** Deja la hora en "HH:MM", o cadena vacia si no es una hora. */
export function limpiarHora(valor: unknown): string {
  if (!esHoraValida(valor)) return "";
  const v = (valor as string).trim();
  return v.length === 4 ? `0${v}` : v;
}

const DIA_LIBRE: DiaHorario = { trabaja: false, entrada: "", salida: "" };

function limpiarDia(valor: any): DiaHorario {
  const entrada = limpiarHora(valor?.entrada);
  const salida = limpiarHora(valor?.salida);
  // `trabaja` se deriva de tener las dos horas: un dia marcado como laborable
  // pero sin horas no sirve para nada -no hay contra que medir el retardo- y
  // se comportaria como un descanso a medias.
  return { trabaja: !!entrada && !!salida, entrada, salida };
}

/** Un horario vacio: nadie trabaja ningun dia. */
export function horarioVacio(): Horario {
  return Array.from({ length: 7 }, () => ({ ...DIA_LIBRE }));
}

/**
 * Convierte lo que venga -JSON de la base, un formulario, `null`- en un
 * horario de siete dias. Si no hay nada y se pasan las columnas viejas, se
 * arma a partir de ellas.
 */
export function normalizarHorario(
  valor: unknown,
  legado?: {
    workScheduleStartWeekday?: string | null;
    workScheduleEndWeekday?: string | null;
    workScheduleStartSaturday?: string | null;
    workScheduleEndSaturday?: string | null;
  } | null
): Horario {
  if (Array.isArray(valor) && valor.length === 7) {
    return valor.map(limpiarDia);
  }

  const horario = horarioVacio();
  if (!legado) return horario;

  const semana = limpiarDia({
    entrada: legado.workScheduleStartWeekday,
    salida: legado.workScheduleEndWeekday,
  });
  const sabado = limpiarDia({
    entrada: legado.workScheduleStartSaturday,
    salida: legado.workScheduleEndSaturday,
  });

  for (const dia of [1, 2, 3, 4, 5]) horario[dia] = { ...semana };
  horario[6] = sabado;
  return horario;
}

/**
 * El horario que le toca a un empleado ese dia de la semana.
 *
 * `entrada` vacia significa que ese dia no trabaja, y eso es lo que hace que
 * un dia de descanso no cuente como falta ni como dia pendiente de capturar.
 */
export function horarioDelDia(
  emp: {
    workSchedule?: unknown;
    workScheduleStartWeekday?: string | null;
    workScheduleEndWeekday?: string | null;
    workScheduleStartSaturday?: string | null;
    workScheduleEndSaturday?: string | null;
  },
  diaSemana: number
): DiaHorario {
  const horario = normalizarHorario(emp.workSchedule, emp);
  return horario[((diaSemana % 7) + 7) % 7] ?? { ...DIA_LIBRE };
}

/** Resumen legible: "L-V 09:00-18:00 · Sáb 10:00-15:00 · descansa Dom". */
export function resumirHorario(horario: Horario): string {
  const trabajados = ORDEN_CAPTURA.filter((d) => horario[d]?.trabaja);
  if (trabajados.length === 0) return "Sin horario";

  const partes = trabajados.map(
    (d) => `${DIAS_SEMANA[d].slice(0, 3)} ${horario[d].entrada}-${horario[d].salida}`
  );
  return partes.join(" · ");
}

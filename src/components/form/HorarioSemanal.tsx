"use client";

import React from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Copy } from "lucide-react";
import {
  DIAS_SEMANA,
  ORDEN_CAPTURA,
  horarioVacio,
  limpiarHora,
  type Horario,
} from "@/lib/horario";

/** Lo que se propone al marcar un día como laborable sin nada que copiar. */
const POR_OMISION = { entrada: "09:00", salida: "18:00" };

interface Props {
  value: Horario;
  onChange: (horario: Horario) => void;
}

/**
 * Horario semanal, un renglón por día.
 *
 * Sustituye a los cuatro campos que había -entrada y salida de lunes a
 * viernes, mas las del sábado-, que no permitían horarios distintos por día,
 * dejaban el domingo fuera y no tenían forma de decir "este día descansa".
 *
 * Los días van de lunes a domingo, no de domingo a sábado: así se lee un
 * horario de trabajo, aunque por dentro el índice sea el de JavaScript.
 *
 * Los botones de copiar existen porque capturar catorce horas a mano, una por
 * una, es lo que hace que nadie llene el horario -y sin horario no hay
 * retardos ni bono de puntualidad-.
 */
export default function HorarioSemanal({ value, onChange }: Props) {
  const horario: Horario = value?.length === 7 ? value : horarioVacio();

  const cambiarDia = (dia: number, cambios: Partial<Horario[number]>) => {
    const siguiente = horario.map((d, i) => (i === dia ? { ...d, ...cambios } : d));
    onChange(siguiente);
  };

  const alternar = (dia: number, trabaja: boolean) => {
    if (!trabaja) {
      // Marcar descanso limpia las horas: un día sin horas no se puede medir,
      // y dejarlas ahí escondidas confunde al volver a activarlo.
      cambiarDia(dia, { trabaja: false, entrada: "", salida: "" });
      return;
    }
    // Al activar se copia el primer día que ya tenga horas, para no teclear.
    const referencia = ORDEN_CAPTURA.map((d) => horario[d]).find((d) => d.entrada && d.salida);
    cambiarDia(dia, {
      trabaja: true,
      entrada: referencia?.entrada || POR_OMISION.entrada,
      salida: referencia?.salida || POR_OMISION.salida,
    });
  };

  const copiarLunes = (dias: readonly number[]) => {
    const lunes = horario[1];
    if (!lunes.entrada || !lunes.salida) return;
    const siguiente = horario.map((d, i) =>
      dias.includes(i) ? { trabaja: true, entrada: lunes.entrada, salida: lunes.salida } : d
    );
    onChange(siguiente);
  };

  const lunesListo = !!horario[1].entrada && !!horario[1].salida;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Copiar el lunes a:</span>
        <button
          type="button"
          onClick={() => copiarLunes([1, 2, 3, 4, 5])}
          disabled={!lunesListo}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <Copy className="size-3" /> Lunes a viernes
        </button>
        <button
          type="button"
          onClick={() => copiarLunes([0, 1, 2, 3, 4, 5, 6])}
          disabled={!lunesListo}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <Copy className="size-3" /> Toda la semana
        </button>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 dark:divide-white/5 dark:border-white/10">
        {ORDEN_CAPTURA.map((dia) => {
          const d = horario[dia];
          return (
            <div
              key={dia}
              className={`flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4 ${
                d.trabaja ? "" : "bg-gray-50/60 dark:bg-white/2"
              }`}
            >
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 sm:min-h-0 sm:w-40 sm:shrink-0">
                <input
                  type="checkbox"
                  checked={d.trabaja}
                  onChange={(e) => alternar(dia, e.target.checked)}
                  className="size-4 rounded text-brand-500 focus:ring-brand-500"
                />
                <span
                  className={`text-sm font-medium ${
                    d.trabaja ? "text-gray-800 dark:text-white/90" : "text-gray-400"
                  }`}
                >
                  {DIAS_SEMANA[dia]}
                </span>
              </label>

              {d.trabaja ? (
                <div className="grid flex-1 grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1 block text-xs text-gray-500">Entrada</Label>
                    <Input
                      type="time"
                      value={d.entrada}
                      onChange={(e) => cambiarDia(dia, { entrada: limpiarHora(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs text-gray-500">Salida</Label>
                    <Input
                      type="time"
                      value={d.salida}
                      onChange={(e) => cambiarDia(dia, { salida: limpiarHora(e.target.value) })}
                    />
                  </div>
                </div>
              ) : (
                <span className="flex-1 text-sm text-gray-400">
                  Descanso · no cuenta como falta
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

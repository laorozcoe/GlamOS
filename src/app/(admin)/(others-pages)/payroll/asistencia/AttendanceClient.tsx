"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DateField from "@/components/form/DateField";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import PageShell from "@/components/layout/PageShell";
import { getAttendanceByDate, upsertManyAttendances } from "./actions";
import { esRetardo, minutosDeRetardo } from "@/lib/asistencia";
import { CheckCircle, Save, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

type AttendanceRecord = {
  id: string | null;
  employeeId: string;
  employeeName: string;
  date: Date;
  status: string;
  checkInTime: string;
  checkOutTime: string;
  notes: string;
  hasRecord: boolean;
  expectedIn: string;
  expectedOut: string;
  isAbsent: boolean;
  isExcused: boolean;
  /// Dia libre de esta persona. No se le pide captura ni cuenta como falta.
  descanso: boolean;
  /// De donde salio la hora. SCHEDULE = quedo el horario y nadie lo confirmo.
  source: string;
  semana: {
    retardos: number;
    faltas: number;
    justificadas: number;
    capturados: number;
    esperados: number;
  };
};

/**
 * Lo que lleva el empleado en la semana del dia consultado.
 *
 * `capturados` frente a `esperados` es el dato que importa: un dia que nadie
 * toco quedo con el horario precargado, y eso no prueba que la persona haya
 * llegado a tiempo. El bono de puntualidad no los va a dar por buenos, asi
 * que conviene verlos aqui, cuando todavia se pueden capturar.
 */
function ResumenSemana({ semana }: { semana: AttendanceRecord["semana"] }) {
  if (!semana || semana.esperados === 0) return null;

  const pendientes = Math.max(0, semana.esperados - semana.capturados);

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
      <span className="font-semibold uppercase tracking-wide text-gray-400">Semana</span>
      <span className={semana.retardos > 0 ? "font-semibold text-amber-600 dark:text-amber-400" : ""}>
        {semana.retardos} {semana.retardos === 1 ? "retardo" : "retardos"}
      </span>
      {semana.faltas > 0 && (
        <span className="font-semibold text-red-600 dark:text-red-400">
          {semana.faltas} {semana.faltas === 1 ? "falta" : "faltas"}
        </span>
      )}
      {semana.justificadas > 0 && (
        <span className="text-blue-600 dark:text-blue-400">{semana.justificadas} justif.</span>
      )}
      {pendientes > 0 && (
        <span className="text-gray-400">
          {pendientes} {pendientes === 1 ? "día sin capturar" : "días sin capturar"}
        </span>
      )}
    </div>
  );
}

export default function AttendanceClient() {
  const [dateStr, setDateStr] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [tolerancia, setTolerancia] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Set today as default
  useEffect(() => {
    const today = new Date();
    const tzoffset = today.getTimezoneOffset() * 60000;
    const localISOTime = new Date(today.getTime() - tzoffset).toISOString().split('T')[0];
    setDateStr(localISOTime);
  }, []);

  // Fetch data when date changes
  useEffect(() => {
    if (dateStr) {
      loadData(dateStr);
    }
  }, [dateStr]);

  const loadData = async (date: string) => {
    setLoading(true);
    try {
      const data = await getAttendanceByDate(date);
      setRecords(data.records as any);
      setTolerancia(data.toleranceMinutes);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando asistencias.");
    } finally {
      setLoading(false);
    }
  };

  // Se identifica la fila por employeeId y no por índice: DataTable entrega la
  // fila, no su posición, y el id es estable aunque cambie el orden.
  const handleRowChange = (
    employeeId: string,
    field: keyof AttendanceRecord,
    value: any
  ) => {
    setRecords((prev) =>
      prev.map((rec) => {
        if (rec.employeeId !== employeeId) return rec;

        const next = { ...rec, [field]: value };

        // Falta y justificado son excluyentes.
        if (field === "isAbsent" && value === true) next.isExcused = false;
        if (field === "isExcused" && value === true) next.isAbsent = false;

        return next;
      })
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await upsertManyAttendances(records, dateStr);
      toast.success("Asistencias actualizadas.");
      loadData(dateStr);
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar asistencias.");
    } finally {
      setSaving(false);
    }
  };

  const isLocked = (rec: AttendanceRecord) => rec.isAbsent || rec.isExcused;

  // Una sola definición para las dos vistas. Antes había dos árboles de JSX
  // completos, alternados con `lg:hidden` / `hidden lg:block`.
  const columns: Column<AttendanceRecord>[] = [
    {
      key: "empleado",
      header: "Empleado / Programado",
      primary: true,
      cell: (rec) => (
        <div>
          <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
            {rec.hasRecord && (
              <span title="Registro completo" className="flex">
                <CheckCircle className="size-4 text-green-500" />
              </span>
            )}
            {rec.employeeName}
            {rec.descanso && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-white/10 dark:text-gray-400">
                Descanso
              </span>
            )}
          </div>
          <div className="mt-1 text-xs font-normal text-gray-500">
            {rec.descanso ? (
              "Hoy no le toca trabajar"
            ) : (
              <>
                Prog.{" "}
                <span className="font-medium text-brand-600">{rec.expectedIn || "-"}</span> a{" "}
                <span className="font-medium text-brand-600">{rec.expectedOut || "-"}</span>
              </>
            )}
          </div>
          <ResumenSemana semana={rec.semana} />
        </div>
      ),
    },
    {
      key: "asistencia",
      header: "Asistencia",
      align: "center",
      cell: (rec) => (
        <div className="flex flex-col items-start gap-2 @3xl:items-center">
          <label
            className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-bold transition-colors @3xl:min-h-0 @3xl:w-auto @3xl:py-1 ${
              rec.isAbsent
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <input
              type="checkbox"
              checked={rec.isAbsent}
              onChange={(e) => handleRowChange(rec.employeeId, "isAbsent", e.target.checked)}
              className="rounded text-red-600 focus:ring-red-500"
            />
            FALTA
          </label>
          <label
            className={`flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-xs font-bold transition-colors @3xl:min-h-0 @3xl:w-auto @3xl:py-1 ${
              rec.isExcused
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <input
              type="checkbox"
              checked={rec.isExcused}
              onChange={(e) => handleRowChange(rec.employeeId, "isExcused", e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            JUSTIF.
          </label>
        </div>
      ),
    },
    {
      key: "entrada",
      header: "H. Entrada",
      className: "w-[150px]",
      cell: (rec) => {
        // Se recalcula mientras se escribe, con la misma regla que usara el
        // servidor al guardar: quien captura ve el retardo antes de guardar.
        const tarde = !isLocked(rec) && esRetardo(rec.checkInTime, rec.expectedIn, tolerancia);
        return (
          <div className="flex flex-col gap-1">
            <Input
              type="time"
              value={rec.checkInTime || ""}
              onChange={(e) => handleRowChange(rec.employeeId, "checkInTime", e.target.value)}
              className={`w-full text-sm ${isLocked(rec) ? "opacity-50" : ""} ${tarde ? "border-amber-400 text-amber-700 dark:text-amber-400" : ""}`}
              disabled={isLocked(rec)}
            />
            {tarde && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                Retardo · {minutosDeRetardo(rec.checkInTime, rec.expectedIn, tolerancia)} min
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "salida",
      header: "H. Salida",
      className: "w-[140px]",
      cell: (rec) => (
        <Input
          type="time"
          value={rec.checkOutTime || ""}
          onChange={(e) => handleRowChange(rec.employeeId, "checkOutTime", e.target.value)}
          className={`w-full text-sm ${isLocked(rec) ? "opacity-50" : ""}`}
          disabled={isLocked(rec)}
        />
      ),
    },
    {
      key: "notas",
      header: "Notas",
      fullWidthOnCard: true,
      cell: (rec) => (
        <Input
          type="text"
          placeholder="Llegó tarde, vacaciones, etc."
          value={rec.notes || ""}
          onChange={(e) => handleRowChange(rec.employeeId, "notes", e.target.value)}
          className="w-full text-sm"
        />
      ),
    },
  ];

  return (
    <PageShell
      title="Registro Diario"
      description={`Se precarga el horario de cada quien: solo cambia la hora cuando hubo retardo. Tolerancia del salón: ${tolerancia} min.`}
      actions={
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
          <DateField
            label="Fecha a consultar"
            value={dateStr}
            onChange={setDateStr}
            containerClassName="sm:w-[200px]"
          />
          <Button
            onClick={handleSaveAll}
            disabled={saving || loading || records.length === 0}
            className="h-11 shrink-0"
          >
            {saving ? "Guardando..." : <><Save className="mr-2 size-4" /> Guardar Todo</>}
          </Button>
        </div>
      }
    >
      <DataTable
        columns={columns}
        rows={records}
        rowKey={(rec) => rec.employeeId}
        loading={loading && records.length === 0}
        empty="No hay empleados activos registrados para mostrar."
        rowClassName={(rec) =>
          rec.descanso && !rec.hasRecord
            ? "opacity-60"
            : rec.hasRecord
              ? "bg-brand-50/30 dark:bg-brand-900/10"
              : ""
        }
      />
    </PageShell>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import DateField from "@/components/form/DateField";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { getAttendanceByDate, upsertManyAttendances } from "./actions";
import { CheckCircle, Save } from "lucide-react";
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
};

export default function AttendanceClient() {
  const [dateStr, setDateStr] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
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
      setRecords(data as any);
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
          </div>
          <div className="mt-1 text-xs font-normal text-gray-500">
            Prog.{" "}
            <span className="font-medium text-brand-600">{rec.expectedIn || "-"}</span> a{" "}
            <span className="font-medium text-brand-600">{rec.expectedOut || "-"}</span>
          </div>
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
      className: "w-[140px]",
      cell: (rec) => (
        <Input
          type="time"
          value={rec.checkInTime || ""}
          onChange={(e) => handleRowChange(rec.employeeId, "checkInTime", e.target.value)}
          className={`w-full text-sm ${isLocked(rec) ? "opacity-50" : ""}`}
          disabled={isLocked(rec)}
        />
      ),
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
    <div>
      <div className="mb-6 flex flex-col items-center justify-between gap-4 border-b border-gray-100 pb-4 sm:flex-row dark:border-white/5">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">Registro Diario</h2>
          <p className="text-sm text-gray-500">Selecciona el día para organizar asistencias.</p>
        </div>
        <div className="flex w-full items-end gap-4 sm:w-auto">
          <DateField
            label="Fecha a consultar"
            value={dateStr}
            onChange={setDateStr}
            containerClassName="flex-1 sm:w-[200px]"
          />
          <Button
            onClick={handleSaveAll}
            disabled={saving || loading || records.length === 0}
            className="h-11 shrink-0"
          >
            {saving ? "Guardando..." : <><Save className="mr-2 size-4" /> Guardar Todo</>}
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={records}
        rowKey={(rec) => rec.employeeId}
        loading={loading && records.length === 0}
        empty="No hay empleados activos registrados para mostrar."
        rowClassName={(rec) =>
          rec.hasRecord ? "bg-brand-50/30 dark:bg-brand-900/10" : ""
        }
      />
    </div>
  );
}

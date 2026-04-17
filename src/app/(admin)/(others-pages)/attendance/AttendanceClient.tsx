"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getAttendanceByDate, upsertManyAttendances } from "./actions";
import { CheckCircle, Check, Save } from "lucide-react";
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

  const handleRowChange = (index: number, field: keyof AttendanceRecord, value: any) => {
    const newRecords = [...records];
    
    // Auto-toggles
    if (field === "isAbsent" && value === true) {
      newRecords[index].isExcused = false; 
    }
    if (field === "isExcused" && value === true) {
      newRecords[index].isAbsent = false;
    }

    newRecords[index] = { ...newRecords[index], [field]: value };
    setRecords(newRecords);
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 border-b border-gray-100 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">Registro Diario</h2>
          <p className="text-sm text-gray-500">Selecciona el día para organizar asistencias.</p>
        </div>
        <div className="flex gap-4 items-end w-full sm:w-auto">
          <div className="flex-1 sm:w-[200px]">
            <Label className="text-sm border-none">Fecha a consultar</Label>
            <Input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full text-sm"
            />
          </div>
          <Button 
            onClick={handleSaveAll} 
            disabled={saving || loading || records.length === 0}
            className="h-[42px]"
          >
            {saving ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Todo</>}
          </Button>
        </div>
      </div>

      {loading && records.length === 0 ? (
        <div className="text-center py-10">Cargando...</div>
      ) : (
        <div className="space-y-4">

          {/* Vista móvil */}
          <ul className="space-y-4 lg:hidden">
            {records.map((rec, i) => {
              const disabledInputs = rec.isAbsent || rec.isExcused;
              return (
              <li key={rec.employeeId} className={`p-4 rounded-xl border ${rec.hasRecord ? 'bg-brand-50/30 border-brand-200 dark:bg-brand-900/10 dark:border-brand-900/50' : 'bg-white border-gray-200 dark:bg-white/5 dark:border-white/10'} shadow-sm`}>
                <div className="flex justify-between items-start mb-3 border-b pb-3 border-gray-100 dark:border-white/5">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{rec.employeeName}</h3>
                    <p className="text-xs text-brand-500 mt-1 font-medium">Prog: {rec.expectedIn || "-"} a {rec.expectedOut || "-"}</p>
                  </div>
                  {rec.hasRecord && (
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> OK
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <label className="flex items-center gap-2 text-sm p-3 border rounded-lg cursor-pointer bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-900/50">
                    <input type="checkbox" checked={rec.isAbsent} onChange={(e) => handleRowChange(i, "isAbsent", e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                    Falta
                  </label>
                  <label className="flex items-center gap-2 text-sm p-3 border rounded-lg cursor-pointer bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50">
                    <input type="checkbox" checked={rec.isExcused} onChange={(e) => handleRowChange(i, "isExcused", e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                    Justificado
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <Label className="text-xs mb-1 block">H. Entrada</Label>
                      <Input
                        type="time"
                        value={rec.checkInTime || ""}
                        onChange={(e) => handleRowChange(i, "checkInTime", e.target.value)}
                        className={`w-full text-sm ${disabledInputs ? 'opacity-50' : ''}`}
                        disabled={disabledInputs}
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">H. Salida</Label>
                      <Input
                        type="time"
                        value={rec.checkOutTime || ""}
                        onChange={(e) => handleRowChange(i, "checkOutTime", e.target.value)}
                        className={`w-full text-sm ${disabledInputs ? 'opacity-50' : ''}`}
                        disabled={disabledInputs}
                      />
                    </div>
                </div>

                <div>
                  <Label className="text-xs mb-1 block">Notas</Label>
                  <Input
                    type="text"
                    placeholder="Llegó tarde, vacaciones, etc."
                    value={rec.notes || ""}
                    onChange={(e) => handleRowChange(i, "notes", e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              </li>
            )})}
          </ul>

          {/* Vista desktop */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-full align-middle text-gray-800 dark:text-white/90">
                <thead className="bg-gray-50 dark:bg-white/2">
                  <tr className="border-b border-gray-200 dark:border-white/5">
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-[200px]">Empleado / Programado</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Asistencia</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-[140px]">H. Entrada</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 w-[140px]">H. Salida</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {records.map((rec, i) => {
                    const disabledInputs = rec.isAbsent || rec.isExcused;
                    return (
                    <tr key={rec.employeeId} className={rec.hasRecord ? 'bg-brand-50/20 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/2'}>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {rec.hasRecord && <span title="Registro Completo" className="flex"><CheckCircle className="w-4 h-4 text-green-500" /></span>}
                          {rec.employeeName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-brand-600">{rec.expectedIn || "-"}</span> a <span className="font-medium text-brand-600">{rec.expectedOut || "-"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col gap-2 items-center justify-center">
                          <label className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded cursor-pointer transition-colors ${rec.isAbsent ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                            <input type="checkbox" checked={rec.isAbsent} onChange={(e) => handleRowChange(i, "isAbsent", e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                            FALTA
                          </label>
                          <label className={`flex items-center gap-2 text-xs font-bold px-2 py-1 rounded cursor-pointer transition-colors ${rec.isExcused ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}>
                            <input type="checkbox" checked={rec.isExcused} onChange={(e) => handleRowChange(i, "isExcused", e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                            JUSTIF.
                          </label>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="time"
                          value={rec.checkInTime || ""}
                          onChange={(e) => handleRowChange(i, "checkInTime", e.target.value)}
                          className={`w-full text-sm ${disabledInputs ? 'opacity-50' : ''}`}
                          disabled={disabledInputs}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="time"
                          value={rec.checkOutTime || ""}
                          onChange={(e) => handleRowChange(i, "checkOutTime", e.target.value)}
                          className={`w-full text-sm ${disabledInputs ? 'opacity-50' : ''}`}
                          disabled={disabledInputs}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          placeholder="Notas..."
                          value={rec.notes || ""}
                          onChange={(e) => handleRowChange(i, "notes", e.target.value)}
                          className="w-full text-sm"
                        />
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            {records.length === 0 && !loading && (
              <div className="text-center py-10 text-gray-500">
                No hay empleados activos registrados para mostrar.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

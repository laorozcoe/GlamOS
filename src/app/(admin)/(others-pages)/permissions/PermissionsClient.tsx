"use client";

import React, { useState, useTransition } from "react";
import Switch from "@/components/form/switch/Switch";
import { updateEmployeePermissions } from "./actions";

interface PermissionsClientProps {
  employees: any[];
}

export default function PermissionsClient({ employees }: PermissionsClientProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = async (employeeId: string, currentVal: boolean) => {
    startTransition(async () => {
      try {
        await updateEmployeePermissions(employeeId, !currentVal);
      } catch (err) {
        console.error("Error updating permission", err);
        alert("Ocurrió un error al actualizar los permisos.");
      }
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <table className="min-w-full align-middle text-gray-800 dark:text-white/90">
          <thead className="bg-gray-50 dark:bg-white/2">
            <tr className="border-b border-gray-200 dark:border-white/5">
              <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Nombre</th>
              <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Rol Sistema</th>
              <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Nómina Activa</th>
              <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">
                Puede Crear Citas
                <p className="text-xs font-normal text-gray-400 mt-0.5">Autorización explícita para agendar</p>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                  {emp.user.name} {emp.user.lastName}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <span className="inline-flex rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                    {emp.user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  {emp.active ? (
                    <span className="text-success-600 font-medium">Activa</span>
                  ) : (
                    <span className="text-gray-400">Inactiva</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-sm">
                  <Switch
                    label={emp.canCreateAppointments ? "Autorizado" : "Restringido"}
                    defaultChecked={emp.canCreateAppointments}
                    onChange={() => handleToggle(emp.id, emp.canCreateAppointments)}
                  />
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">No hay empleados registrados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

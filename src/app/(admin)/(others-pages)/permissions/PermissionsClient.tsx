"use client";

import React, { useState, useTransition } from "react";
import Switch from "@/components/form/switch/Switch";
import { updateEmployeePermissions } from "./actions";
import { User, Shield, Calendar, CheckCircle, XCircle } from "lucide-react";

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
    <div className="space-y-4">
      {/* Header para móvil */}
      {/* <div className="lg:hidden bg-gray-50 dark:bg-white/2 rounded-lg p-4 border border-gray-200 dark:border-white/5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <Calendar className="w-4 h-4 mx-auto mb-1 text-gray-500" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Crear Citas</p>
          </div>
          <div className="text-center">
            <Shield className="w-4 h-4 mx-auto mb-1 text-gray-500" />
            <p className="font-medium text-gray-700 dark:text-gray-300">Permisos</p>
          </div>
        </div>
      </div> */}

      {/* Lista de empleados - Vista móvil primero */}
      <ul className="space-y-3 lg:hidden">
        {employees.map((emp) => (
          <li key={emp.id} className="bg-white dark:bg-white/3 rounded-lg border border-gray-200 dark:border-white/5 p-4 shadow-sm">
            <div className="space-y-3">
              {/* Header con info principal */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {emp.user.name} {emp.user.lastName}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {emp.user.role}
                    </span>
                    {emp.active ? (
                      <span className="inline-flex items-center text-success-600 font-medium">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactiva
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Permiso de crear citas */}
              <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Puede Crear Citas
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Autorización explícita para agendar
                    </p>
                  </div>
                  <Switch
                    label={emp.canCreateAppointments ? "Autorizado" : "Restringido"}
                    defaultChecked={emp.canCreateAppointments}
                    onChange={() => handleToggle(emp.id, emp.canCreateAppointments)}
                  />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Vista desktop - Tabla original */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
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
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado vacío */}
      {employees.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No hay empleados registrados</p>
          <p className="text-gray-400 text-sm mt-2">Comienza agregando empleados para gestionar sus permisos</p>
        </div>
      )}
    </div>
  );
}

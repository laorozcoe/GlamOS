"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch"; // ADDED SWITCH
import { createEmployee, updateEmployee, deleteEmployee } from "./actions";
import { TrashIcon, User, Mail, Shield, DollarSign, CheckCircle, XCircle, Edit } from "lucide-react";

interface EmployeeClientProps {
  users: any[];
}

export default function EmployeeClient({ users }: EmployeeClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false);
  const [isDisableFinalConfirmOpen, setIsDisableFinalConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    role: "RECEPTION",
    commission: 0,
    baseSalary: 0,
    hasPayroll: false, // NEW STATE
    workScheduleStartWeekday: "",
    workScheduleEndWeekday: "",
    workScheduleStartSaturday: "",
    workScheduleEndSaturday: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openNewEmployee = () => {
    setEditingUserId(null);
    setFormData({
      name: "",
      lastName: "",
      email: "",
      password: "",
      phone: "",
      role: "RECEPTION",
      commission: 0,
      baseSalary: 0,
      hasPayroll: false,
      workScheduleStartWeekday: "",
      workScheduleEndWeekday: "",
      workScheduleStartSaturday: "",
      workScheduleEndSaturday: "",
    });
    setIsOpen(true);
  };

  const openEditEmployee = (user: any) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name || "",
      lastName: user.lastName || "",
      email: user.email || user.username || "",
      password: "", // Contraseña vacía por seguridad
      phone: user.phone || user.employee?.phone || "",
      role: user.role || "RECEPTION",
      commission: user.employee?.commission || 0,
      baseSalary: user.employee?.baseSalary || 0,
      hasPayroll: !!(user.employee && user.employee.active),
      workScheduleStartWeekday: user.employee?.workScheduleStartWeekday || "",
      workScheduleEndWeekday: user.employee?.workScheduleEndWeekday || "",
      workScheduleStartSaturday: user.employee?.workScheduleStartSaturday || "",
      workScheduleEndSaturday: user.employee?.workScheduleEndSaturday || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUserId) {
        await updateEmployee(editingUserId, formData);
      } else {
        await createEmployee(formData);
      }
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert(editingUserId ? "Error al actualizar el usuario." : "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingUserId) return;

    setLoading(true);
    try {
      await deleteEmployee(editingUserId);
      setIsDisableConfirmOpen(false);
      setIsDisableFinalConfirmOpen(false);
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <Button onClick={openNewEmployee}>Añadir Usuario</Button>
      </div>

      <div className="space-y-4">
    
      {/* Lista de empleados - Vista móvil primero */}
      <ul className="space-y-3 lg:hidden">
        {users.map((user) => (
          <li key={user.id} className="bg-white dark:bg-white/3 rounded-lg border border-gray-200 dark:border-white/5 p-4 shadow-sm">
            <div className="space-y-3">
              {/* Header con info principal */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 justify-between">
                   <div className="flex items-center gap-2">
                     <User className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user.name} {user.lastName}
                    </h3>
                   </div>
                     <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditEmployee(user)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm mt-5 ">
                    <span className="inline-flex rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {user.role}
                    </span>
                    {user.employee && user.employee.active ? (
                      <span className="inline-flex items-center text-success-600 font-medium ">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
               
              </div>

              {/* Información de contacto */}
              <div className="border-t border-gray-100 dark:border-white/5 pt-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-3 h-3" />
                  <span>{user.email || user.username}</span>
                </div>
              </div>

              {/* Información de nómina */}
              {user.employee && user.employee.active && (
                <div className="border-t border-gray-100 dark:border-white/5 pt-3 ">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Sueldo Base</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        ${user.employee.baseSalary}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Comisión</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.employee.commission}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Email</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Rol</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Nómina Activa</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Sueldo Base</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/5">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openEditEmployee(user)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/2 transition-colors"
                >
                  <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-brand-600 dark:text-brand-400">
                    {user.name} {user.lastName}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">{user.email || user.username}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    <span className="inline-flex rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm">
                    {user.employee && user.employee.active ? (
                      <span className="inline-flex rounded-full bg-success-50 px-2 py-1 text-xs font-semibold text-success-700">Sí</span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-500">No</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                    {user.employee && user.employee.active ? `$${user.employee.baseSalary}` : "-"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                    {user.employee && user.employee.active ? `${user.employee.commission}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Estado vacío */}
      {users.length === 0 && (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium">No hay empleados registrados</p>
          <p className="text-gray-400 text-sm mt-2">Comienza agregando empleados para gestionar tu nómina</p>
        </div>
      )}
    </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-h-[95svh] overflow-y-auto p-6">
        <div className="mb-5">
          <Label className="text-lg font-bold text-gray-800 dark:text-white/90">
            {editingUserId ? "Editar Usuario" : "Nuevo Usuario"}
          </Label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre(s)</Label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Juan"


              />
            </div>
            <div>
              <Label>Apellidos</Label>
              <Input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Pérez"

              />
            </div>
            <div>
              <Label>Correo Electrónico</Label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="juan@ejemplo.com"
              />
            </div>
            <div>
              <Label>{editingUserId ? "Nueva Contraseña (Opcional)" : "Contraseña"}</Label>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••"

              />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="5512345678"
              />
            </div>
            <div>
              <Label>Rol del Sistema</Label>
              <Select
                name="role"
                value={formData.role}
                onChange={(val) => handleSelectChange("role", val)}
                options={[
                  { label: "Recepcionista", value: "RECEPTION" },
                  { label: "Empleado / Profesional", value: "EMPLOYEE" },
                  { label: "Administrador", value: "ADMIN" },
                ]}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Incluir en Nómina Semanal</h4>
                <p className="text-xs text-gray-500">Habilita esta opción si este usuario ganará sueldo base o comisiones.</p>
              </div>
              <Switch
                label={formData.hasPayroll ? "Sí" : "No"}
                defaultChecked={formData.hasPayroll}
                onChange={(checked) => setFormData((prev) => ({ ...prev, hasPayroll: checked }))}
              />
            </div>

            {formData.hasPayroll && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg bg-gray-50 p-4 dark:bg-white/2">
                <div>
                  <Label>Sueldo Base (Semanal)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      name="baseSalary"
                      min="0"
                      className="pl-8"
                      value={formData.baseSalary}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div>
                  <Label>Comisión por Trabajo</Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      name="commission"
                      className="pr-8"
                      min="0"
                      max="100"
                      value={formData.commission}
                      onChange={handleChange}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Horario Section */}
          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">Horario de Trabajo (Cálculo de Sueldo)</h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl">
                  <Label className="font-bold text-sm mb-3 block">Lunes a Viernes</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Entrada</Label>
                      <Input
                        type="time"
                        name="workScheduleStartWeekday"
                        value={formData.workScheduleStartWeekday}
                        onChange={handleChange}
                        className="w-full text-sm p-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Salida</Label>
                      <Input
                        type="time"
                        name="workScheduleEndWeekday"
                        value={formData.workScheduleEndWeekday}
                        onChange={handleChange}
                        className="w-full text-sm p-2"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/2 p-4 rounded-xl">
                  <Label className="font-bold text-sm mb-3 block">Sábados</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Entrada</Label>
                      <Input
                        type="time"
                        name="workScheduleStartSaturday"
                        value={formData.workScheduleStartSaturday}
                        onChange={handleChange}
                        className="w-full text-sm p-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Salida</Label>
                      <Input
                        type="time"
                        name="workScheduleEndSaturday"
                        value={formData.workScheduleEndSaturday}
                        onChange={handleChange}
                        className="w-full text-sm p-2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-center sm:justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/5">
            {editingUserId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDisableConfirmOpen(true)}
                className="text-error-600 border-error-300 hover:bg-error-50"
              >
                <TrashIcon size={16} />
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmación 1 */}
      <Modal
        isOpen={isDisableConfirmOpen}
        onClose={() => setIsDisableConfirmOpen(false)}
        className="max-w-sm p-6 rounded-2xl"
      >
        <Label className="text-lg font-bold mb-2">¿Borrar empleado?</Label>
        <Label className="text-gray-500 text-sm my-6">
          El empleado dejará de estar activo, pero sus registros se conservarán.
        </Label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsDisableConfirmOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              setIsDisableConfirmOpen(false);
              setIsDisableFinalConfirmOpen(true);
            }}
            disabled={loading}
          >
            Continuar
          </Button>
        </div>
      </Modal>

      {/* Confirmación 2 */}
      <Modal
        isOpen={isDisableFinalConfirmOpen}
        onClose={() => setIsDisableFinalConfirmOpen(false)}
        className="max-w-sm p-6 rounded-2xl"
      >
        <Label className="text-lg font-bold mb-2">Confirmación final</Label>
        <Label className="text-gray-500 text-sm my-6">
          Esta acción desactivará el empleado para operaciones futuras. ¿Deseas continuar?
        </Label>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsDisableFinalConfirmOpen(false)}
            disabled={loading}
          >
            Regresar
          </Button>
          <Button
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Borrando..." : "Sí, Borrar"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Switch from "@/components/form/switch/Switch"; // ADDED SWITCH
import { createEmployee, updateEmployee, deleteEmployee } from "./actions";
import { TrashIcon } from "lucide-react";

interface EmployeeClientProps {
  users: any[];
}

export default function EmployeeClient({ users }: EmployeeClientProps) {
  const [isOpen, setIsOpen] = useState(false);
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
    if (!window.confirm("¿Estás seguro de inhabilitar este empleado?")) return;

    setLoading(true);
    try {
      await deleteEmployee(editingUserId);
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

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <table className="min-w-full align-middle text-gray-800 dark:text-white/90">
            <thead className="bg-gray-50 dark:bg-white/[0.02]">
              <tr className="border-b border-gray-200 dark:border-white/[0.05]">
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Nombre</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Email</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Rol</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Nómina Activa</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Sueldo Base</th>
                <th className="px-5 py-3 text-left text-sm font-medium tracking-wider text-gray-500">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-white/[0.05]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openEditEmployee(user)}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
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
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No hay usuarios registrados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} className="max-w-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white/90">
            {editingUserId ? "Editar Usuario" : "Nuevo Usuario"}
          </h3>
          {editingUserId && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-error-500 hover:text-error-600 transition-colors bg-error-50 dark:bg-error-500/10 p-2 rounded-lg"
              title="Inhabilitar Empleado"
            >
              <TrashIcon size={20} />
            </button>
          )}
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

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.02]">
                <div>
                  <Label>Sueldo Base (Semanal)</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      name="baseSalary"
                      min="0"
                      step="0.01"
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
                      step="1"
                      value={formData.commission}
                      onChange={handleChange}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

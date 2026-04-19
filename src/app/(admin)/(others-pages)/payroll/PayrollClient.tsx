"use client";

import React, { useState, useEffect, useCallback } from "react";
import ComponentCard from "@/components/common/ComponentCard";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import { getPayrollData } from "./actions";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
};

const formatDateObj = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleDateString("es-MX", { month: "short", day: "numeric" });
};

const formatTimeObj = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

export default function PayrollClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal state
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const fetchPayroll = useCallback(async (dateToFetch: Date) => {
    setLoading(true);
    try {
      const d = new Date(dateToFetch);

      const startDate = new Date(d);
      startDate.setDate(d.getDate() - d.getDay());
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const res = await getPayrollData(startDate.toISOString(), endDate.toISOString());
      setData(res);
    } catch (err) {
      console.error(err);
      alert("Error al cargar la nómina");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayroll(currentDate);
  }, [currentDate, fetchPayroll]);

  const changeWeek = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentDate(newDate);
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "RECEPTION") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (role === "ADMIN") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    return "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400";
  };

  return (
    <div>
      {/* Navegador de Semanas */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white dark:bg-white/3 p-4 rounded-xl border border-gray-200 dark:border-white/5">
        <Button variant="outline" onClick={() => changeWeek(-1)}>
          &larr; Semana Anterior
        </Button>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          {data ? (
            <>
              {formatDateObj(data.startDate)} - {formatDateObj(data.endDate)}
            </>
          ) : (
            "Cargando fechas..."
          )}
        </h2>
        <Button variant="outline" onClick={() => changeWeek(1)}>
          Siguiente Semana &rarr;
        </Button>
      </div>

      {loading ? (
        <div className="flex w-full items-center justify-center p-10">
          <p className="text-gray-500">Calculando nómina...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data?.payrollData.length === 0 && (
            <div className="col-span-full py-10 text-center text-gray-500">
              No hay empleados activos registrados para el negocio.
            </div>
          )}

          {data?.payrollData.map((emp: any) => (
            <div
              key={emp.employeeId}
              onClick={() => setSelectedEmployee(emp)}
              className="cursor-pointer transition-transform ease-in-out hover:-translate-y-1"
            >
              <ComponentCard title={emp.name} className="h-full shadow-theme-sm hover:shadow-theme-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRoleBadgeColor(emp.role)}`}>
                    {emp.role}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    Comisión: {emp.commissionPercentage}%
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Sueldo Base:</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(emp.baseSalary)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Total Transaccionado:</span>
                    <span className="font-medium text-gray-800 dark:text-white/90">{formatCurrency(emp.totalSalesGenerated)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-600 dark:text-brand-400">Ganancia Comisiones:</span>
                    <span className="font-semibold text-brand-600 dark:text-brand-400">+{formatCurrency(emp.commissionPay)}</span>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                    <span className="font-medium text-gray-800 dark:text-white/90">Total a Pagar:</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(emp.totalPay)}</span>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <span className="text-xs text-brand-500 font-medium group-hover:underline">Ver detalle de semana &rarr;</span>
                </div>
              </ComponentCard>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        showCloseButton={false}
        className="w-[95svw] h-[95svh] max-w-3xl p-6"
      >
        {selectedEmployee && (
          <div className="h-full flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">
                  {selectedEmployee.name}
                </h3>
                <p className="text-sm text-gray-500">Resumen de Semana ({formatDateObj(data.startDate)} - {formatDateObj(data.endDate)})</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-bold text-brand-600">{formatCurrency(selectedEmployee.totalPay)}</span>
                <span className="text-xs text-gray-500 mb-1 block">Total Semana</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg dark:bg-white/2">
                <p className="text-xs text-gray-500">Sueldo Base</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">{formatCurrency(selectedEmployee.baseSalary)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg dark:bg-white/2">
                <p className="text-xs text-gray-500">Vendido General</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">{formatCurrency(selectedEmployee.totalSalesGenerated)}</p>
              </div>
              <div className="bg-brand-50 p-3 rounded-lg dark:bg-brand-900/10">
                <p className="text-xs text-brand-600 dark:text-brand-400">Comisiones ({selectedEmployee.commissionPercentage}%)</p>
                <p className="font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(selectedEmployee.commissionPay)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg dark:bg-white/2">
                <p className="text-xs text-gray-500">Trabajos (#)</p>
                <p className="font-semibold text-gray-800 dark:text-white/90">{selectedEmployee.sales.length}</p>
              </div>
            </div>

            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 pb-2 dark:border-white/5">
              Ticket / Servicios Realizados
            </h4>

            <div className=" flex-1 overflow-y-auto">
              {selectedEmployee.sales.length > 0 ? (
                <div className="space-y-3">
                  {selectedEmployee.sales.map((sale: any) => (
                    <div key={sale.id} className="p-4 border border-gray-100 rounded-lg dark:border-white/5 bg-gray-50/50 dark:bg-transparent">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium text-gray-800 dark:text-white/90 block">
                            Folio de Venta #{sale.folio}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateObj(sale.createdAt)} a las {formatTimeObj(sale.createdAt)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 dark:text-white block">{formatCurrency(sale.total)}</span>
                          <span className="text-xs text-success-600 font-medium">+ {formatCurrency(sale.total * (selectedEmployee.commissionPercentage / 100))} (Com.)</span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        <p className="font-medium mb-1 text-xs uppercase text-gray-500">Items:</p>
                        <ul className="list-disc pl-5">
                          {sale.items.map((item: any) => (
                            <li key={item.id}>
                              {item.quantity}x {item.description} - {formatCurrency(item.price)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500">
                  Este empleado no registró ninguna venta ni brindó servicios esta semana.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setSelectedEmployee(null)}>
                Cerrar Detalle
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

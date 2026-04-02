'use client'
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import Label from "@/components/form/Label"

import { useState, useEffect } from 'react'
import { getDailySummary } from '@/lib/prisma'

import { Users, Banknote, CreditCard, Clock } from 'lucide-react'
import ComponentCard from "@/components/common/ComponentCard"
import { useBusiness } from "@/context/BusinessContext";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/form/date-picker";
import { Modal } from "@/components/ui/modal";
import Switch from "@/components/form/switch/Switch";
import { toast } from "react-toastify";

// export default async function Ecommerce() {

//   return (
//     <div className=" grid-cols-12 gap-4 md:gap-6 w-full h-full flex items-center justify-center">

//       {/* <img src={`/${business?.slug}/logo2.png`} className="w-96 h-96" alt="Logo" /> */}
//       {/* <div className="col-span-12 space-y-6 xl:col-span-7">
//         <EcommerceMetrics />

//         <MonthlySalesChart />
//       </div>

//       <div className="col-span-12 xl:col-span-5">
//         <MonthlyTarget />
//       </div>

//       <div className="col-span-12">
//         <StatisticsChart />
//       </div>

//       <div className="col-span-12 xl:col-span-5">
//         <DemographicCard />
//       </div>

//       <div className="col-span-12 xl:col-span-7">
//         <RecentOrders />
//       </div> */}
//     </div>
//   );
// }


// components/DailySummaryScreen.tsx

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DailySummaryScreen() {
  const business = useBusiness();
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(getTodayString());

  // Modal States
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [globalModalType, setGlobalModalType] = useState<"ALL" | "CASH" | "CARD" | "TRANSFER">("ALL");
  const [groupByEmployee, setGroupByEmployee] = useState(false);

  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployeeItem, setSelectedEmployeeItem] = useState<any>(null);

  const handleGlobalClick = (type: "ALL" | "CASH" | "CARD" | "TRANSFER") => {
    if (!summary || !summary.employeeStats) return;

    let hasSales = false;
    summary.employeeStats.forEach((emp: any) => {
      if (emp.sales) {
        if (type === "ALL" && emp.sales.length > 0) hasSales = true;
        else {
          const typeSales = emp.sales.filter((s: any) => s.payments?.some((p: any) => p.method === type && p.status === 'COMPLETED'));
          if (typeSales.length > 0) hasSales = true;
        }
      }
    });

    if (!hasSales) {
      toast.info("No hay ventas registradas de este tipo.");
      return;
    }

    setGlobalModalType(type);
    setGlobalModalOpen(true);
  };

  const handleEmployeeClick = (emp: any) => {
    if (!emp.sales || emp.sales.length === 0) {
      toast.info("No hay ventas registradas para este empleado el día de hoy.");
      return;
    }

    const hasCompletedPayments = emp.sales.some((s: any) => s.payments && s.payments.some((p: any) => p.status === 'COMPLETED'));
    if (!hasCompletedPayments) {
      toast.info("No hay cobros completados para este empleado el día de hoy.");
      return;
    }

    setSelectedEmployeeItem(emp);
    setEmployeeModalOpen(true);
  };

  const fetchSummary = async (dateToFetch: string) => {
    setLoading(true); // Mostramos el loading al cambiar de día
    const data = await getDailySummary(business?.id, dateToFetch);
    setSummary(data);
    setLoading(false);
  };

  const handleUpdateDate = async (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  useEffect(() => {

    if (business?.id) {
      fetchSummary(selectedDate);
    }
  }, [selectedDate, business?.id])

  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log("¡Pull to refresh detectado en la vista!");
      fetchSummary(selectedDate); // Consultamos usando la fecha actual del estado
    };

    window.addEventListener('app:pullToRefresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:pullToRefresh', handleGlobalRefresh);
  }, [selectedDate]); // Agregamos selectedDate a las dependencias

  // if (loading || !summary) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <p className="text-gray-500 text-lg animate-pulse">Cargando métricas del día...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* HEADER Y TOTALES DEL DÍA */}
      <div className="gap-y-3">
        <div className="">
          <Label className="text-3xl font-bold text-gray-800 mb-6 text-center sm:text-start">
            Resumen
          </Label>
          <div className="flex gap-3 mb-6 justify-center w-full md:w-auto">
            <Button onClick={() => { handleUpdateDate(-1) }}>&lt;</Button>
            {/* <InputField type="date" value={logic.currentDate} onChange={(e) => logic.setCurrentDate(e.target.value)} /> */}
            <DatePicker value={selectedDate} onChange={(date) => setSelectedDate(date)} />
            <Button onClick={() => { handleUpdateDate(1) }}>&gt;</Button>
          </div>
        </div>
        {loading || !summary ?
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500 text-lg animate-pulse">Cargando métricas del día...</p>
          </div> :
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div onClick={() => handleGlobalClick("ALL")} className="cursor-pointer transition-transform hover:scale-105">
              <ComponentCard className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center h-full" title={"Ingreso Total Hoy"}>
                <Label className="text-4xl font-extrabold text-gray-900">${summary.totalDay.toFixed(2)}</Label>
              </ComponentCard>
            </div>
            <div onClick={() => handleGlobalClick("CASH")} className="cursor-pointer transition-transform hover:scale-105">
              <ComponentCard className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-6 flex flex-col justify-center items-center h-full" title="Total Efectivo">
                <Label className="text-3xl font-bold" color="text-green-600">${summary.totalCashDay.toFixed(2)}</Label>
              </ComponentCard>
            </div>
            <div onClick={() => handleGlobalClick("CARD")} className="cursor-pointer transition-transform hover:scale-105">
              <ComponentCard className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center items-center h-full" title="Total Tarjeta">
                <Label className="text-3xl font-bold" color="text-blue-600">${summary.totalCardDay.toFixed(2)}</Label>
              </ComponentCard>
            </div>
            <div onClick={() => handleGlobalClick("TRANSFER")} className="cursor-pointer transition-transform hover:scale-105">
              <ComponentCard className="bg-violet-50 rounded-xl shadow-sm border border-violet-100 p-6 flex flex-col justify-center items-center h-full" title="Total Transferencia">
                <Label className="text-3xl font-bold" color="text-violet-600">${summary.totaTransferDay.toFixed(2)}</Label>
              </ComponentCard>
            </div>
          </div>
        }
      </div>
      {/* TARJETAS POR EMPLEADO */}
      {loading || !summary ? <></> :
        <div>
          <div className="text-2xl font-semibold text-gray-800 mb-4 flex items-center justify-center sm:justify-start gap-2 text-center sm:text-start">
            <Users className="w-6 h-6 text-gray-500" />
            <Label className="">Rendimiento por Empleado</Label>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,320px)] justify-center gap-4">
            {summary.employeeStats.map((emp: any) => (
              <div key={emp.id} onClick={() => handleEmployeeClick(emp)} className="cursor-pointer transition-transform hover:scale-105">
                <ComponentCard title={emp.name}>
                  <div className="p-4 space-y-4">

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Banknote className="w-5 h-5 text-green-500" />
                        <Label>Efectivo</Label>
                      </div>
                      <Label className="font-semibold text-gray-900">${emp.cash.toFixed(2)}</Label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        <Label>Tarjeta</Label>
                      </div>
                      <Label className="font-semibold text-gray-900">${emp.card.toFixed(2)}</Label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <CreditCard className="w-5 h-5 text-violet-500" />
                        <Label>Transferencia</Label>
                      </div>
                      <Label className="font-semibold text-gray-900">${emp.transfer.toFixed(2)}</Label>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-orange-600 font-medium">
                        <Clock className="w-5 h-5" />
                        <Label>Citas Pendientes</Label>
                      </div>
                      <Label className={`px-3 py-1 rounded-full text-sm font-bold ${emp.pendingAppointments > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                        {emp.pendingAppointments}
                      </Label>
                    </div>

                  </div>
                </ComponentCard>
              </div>

            ))}

            {summary.employeeStats.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No hay empleados registrados en este negocio.
              </div>
            )}
          </div>
        </div>}

      {/* Global Sales Modal */}
      <Modal isOpen={globalModalOpen} onClose={() => setGlobalModalOpen(false)} className="max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-4">
            <Label className="text-2xl font-bold text-gray-800">
              Ventas - {globalModalType === "ALL" ? "Todas" : globalModalType === "CASH" ? "Efectivo" : globalModalType === "CARD" ? "Tarjeta" : "Transferencia"}
            </Label>
            <Switch
              label="Por empleado"
              defaultChecked={groupByEmployee}
              onChange={(checked) => setGroupByEmployee(checked)}
            />
          </div>

          <div className="mt-4 space-y-4">
            {summary && (() => {
              const filterSalesByMethod = (salesArray: any[]) => {
                if (globalModalType === "ALL") return salesArray;
                return salesArray.filter(sale =>
                  sale.payments && sale.payments.some((p: any) => p.method === globalModalType && p.status === 'COMPLETED')
                );
              };

              if (groupByEmployee) {
                return summary.employeeStats.map((emp: any) => {
                  if (!emp.sales) return null;
                  const empSales = filterSalesByMethod(emp.sales);
                  if (empSales.length === 0) return null;
                  return (
                    <div key={emp.id} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200">
                      <div className="flex justify-between items-center mb-3">
                        <Label className="text-lg font-bold text-gray-800">{emp.name}</Label>
                        <Label className="font-bold text-gray-900 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm border border-gray-200">
                          Total: ${empSales.reduce((acc: number, s: any) => acc + s.total, 0).toFixed(2)}
                        </Label>
                      </div>
                      <ul className="space-y-2">
                        {empSales.map((sale: any) => (
                          <li key={sale.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                                {sale.folio || "V"}
                              </div>
                              {(() => {
                                const methods = sale.payments?.filter((p: any) => p.status === 'COMPLETED').map((p: any) => p.method) || [];
                                if (methods.includes('TRANSFER')) return <CreditCard className="w-5 h-5 text-violet-500" />;
                                if (methods.includes('CARD')) return <CreditCard className="w-5 h-5 text-blue-500" />;
                                if (methods.includes('CASH')) return <Banknote className="w-5 h-5 text-green-500" />;
                                return null;
                              })()}
                              <Label className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Label>
                            </div>
                            <Label className="font-bold" color="text-brand-500 dark:text-brand-400">${sale.total.toFixed(2)}</Label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                });
              } else {
                let allSales: any[] = [];
                summary.employeeStats.forEach((emp: any) => {
                  if (emp.sales) {
                    allSales = [...allSales, ...emp.sales.map((s: any) => ({ ...s, empName: emp.name }))];
                  }
                });
                const filteredSales = filterSalesByMethod(allSales).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                if (filteredSales.length === 0) return <p className="text-gray-500 text-center py-4">No hay ventas para mostrar.</p>;

                const totalAmount = filteredSales.reduce((acc: number, s: any) => acc + s.total, 0);

                return (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Label className="font-bold  px-4 py-2 rounded-full shadow-sm border border-gray-200">
                        Total General: ${totalAmount.toFixed(2)}
                      </Label>
                    </div>
                    <ul className="space-y-2">
                      {filteredSales.map((sale: any) => (
                        <li key={sale.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-100">
                          <div className="flex items-center gap-2 ">
                            <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                              {sale.folio || "V"}
                            </div>
                            {(() => {
                              const methods = sale.payments?.filter((p: any) => p.status === 'COMPLETED').map((p: any) => p.method) || [];
                              if (methods.includes('TRANSFER')) return <CreditCard className="w-5 h-5 text-violet-500" />;
                              if (methods.includes('CARD')) return <CreditCard className="w-5 h-5 text-blue-500" />;
                              if (methods.includes('CASH')) return <Banknote className="w-5 h-5 text-green-500" />;
                              return null;
                            })()}
                            <Label className="">{sale.empName}</Label>
                            <Label className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Label>
                          </div>
                          <Label className="font-bold" color="text-brand-500 dark:text-brand-400">${sale.total.toFixed(2)}</Label>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </Modal>

      {/* Employee Details Modal */}
      <Modal isOpen={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)} className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {selectedEmployeeItem && (
          <div className="space-y-6">
            <Label className="text-2xl font-bold" color="text-brand-500 dark:text-brand-400">Detalle: {selectedEmployeeItem.name}</Label>

            {(() => {
              if (!selectedEmployeeItem.sales || selectedEmployeeItem.sales.length === 0) {
                return <p className="text-gray-500 text-center py-4">No hay ventas registradas el día de hoy.</p>;
              }

              const salesByMethod = {
                CASH: [] as any[],
                CARD: [] as any[],
                TRANSFER: [] as any[]
              };

              selectedEmployeeItem.sales.forEach((sale: any) => {
                if (sale.payments) {
                  sale.payments.forEach((p: any) => {
                    if (p.status === 'COMPLETED' && salesByMethod[p.method as keyof typeof salesByMethod]) {
                      salesByMethod[p.method as keyof typeof salesByMethod].push(sale);
                    }
                  });
                }
              });

              return (
                <div className="space-y-6">
                  {/* Efectivo */}
                  {salesByMethod.CASH.length > 0 && (
                    <div className="bg-green-50 dark:bg-green-950 p-4 rounded-xl border border-green-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Banknote className="w-5 h-5 text-green-500" />
                          <Label className="text-lg font-bold text-gray-800">Efectivo</Label>
                        </div>
                        <span className="font-bold text-green-800 bg-green-100 px-3 py-1 rounded-full shadow-sm">
                          Total: ${salesByMethod.CASH.reduce((acc: number, s: any) => acc + s.total, 0).toFixed(2)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {salesByMethod.CASH.map((sale: any) => (
                          <li key={sale.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div>
                              <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                                {sale.folio || "V"}
                              </div>
                              <Label className="text-xs text-gray-500 mt-1">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Label>
                            </div>
                            <Label className="font-bold " color="text-brand-500 dark:text-brand-400">${sale.total.toFixed(2)}</Label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Tarjeta */}
                  {salesByMethod.CARD.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-xl border border-blue-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-500" />
                          <Label className="text-lg font-bold text-gray-800">Tarjeta</Label>
                        </div>
                        <span className="font-bold text-blue-800 bg-blue-100 px-3 py-1 rounded-full shadow-sm">
                          Total: ${salesByMethod.CARD.reduce((acc: number, s: any) => acc + s.total, 0).toFixed(2)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {salesByMethod.CARD.map((sale: any) => (
                          <li key={sale.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div>
                              <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                                {sale.folio || "V"}
                              </div>
                              <Label className="text-xs text-gray-500 mt-1">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Label>
                            </div>
                            <Label className="font-bold" color="text-brand-500 dark:text-brand-400">${sale.total.toFixed(2)}</Label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Transferencia */}
                  {salesByMethod.TRANSFER.length > 0 && (
                    <div className="bg-violet-50 dark:bg-violet-950 p-4 rounded-xl border border-violet-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-violet-500" />
                          <Label className="text-lg font-bold text-gray-800">Transferencia</Label>
                        </div>
                        <span className="font-bold text-violet-800 bg-violet-100 px-3 py-1 rounded-full shadow-sm">
                          Total: ${salesByMethod.TRANSFER.reduce((acc: number, s: any) => acc + s.total, 0).toFixed(2)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {salesByMethod.TRANSFER.map((sale: any) => (
                          <li key={sale.id} className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm">
                            <div>
                              <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-brand-100 rounded-full text-brand-600 font-bold uppercase">
                                {sale.folio || "V"}
                              </div>
                              <Label className="text-xs text-gray-500 mt-1">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Label>
                            </div>
                            <Label className="font-bold" color="text-brand-500 dark:text-brand-400">${sale.total.toFixed(2)}</Label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </Modal>

    </div>
  )
}

// <div key={emp.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
//   {/* Cabecera de la tarjeta del empleado */}
//   <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
//     <h3 className="text-lg font-bold text-gray-800 truncate"></h3>
//   </div>

//   {/* Cuerpo de la tarjeta */}

// </div>
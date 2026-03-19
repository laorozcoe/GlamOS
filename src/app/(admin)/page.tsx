'use client'
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import Label from "@/components/form/Label"

// import { useBusiness } from "@/context/BusinessContext";

import { useState, useEffect } from 'react'
import { getDailySummary } from '@/lib/prisma'

// Iconos (opcionales, puedes usar lucide-react o heroicons)
import { Users, Banknote, CreditCard, Clock } from 'lucide-react'
import ComponentCard from "@/components/common/ComponentCard"
import { useBusiness } from "@/context/BusinessContext";

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


export default function DailySummaryScreen() {
  const business = useBusiness();
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchSummary = async () => {
    const newDate = new Date();
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const day = String(newDate.getDate()).padStart(2, "0");

    debugger
    const start = `${year}-${month}-${day}`;
    const data = await getDailySummary(business?.id, start)
    setSummary(data)
    setLoading(false)
  }
  useEffect(() => {

    fetchSummary()
  }, [])

  // El "Oído" que escucha el Pull To Refresh
  useEffect(() => {
    const handleGlobalRefresh = () => {
      console.log("¡Pull to refresh detectado en la vista!");
      fetchSummary(); // Volvemos a consultar la base de datos
    };

    // Nos suscribimos al evento
    window.addEventListener('app:pullToRefresh', handleGlobalRefresh);

    // Limpiamos el evento cuando desmontamos el componente
    return () => window.removeEventListener('app:pullToRefresh', handleGlobalRefresh);
  }, []); // Pon aquí tus dependencias, como la fecha seleccionada

  if (loading || !summary) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500 text-lg animate-pulse">Cargando métricas del día...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">

      {/* HEADER Y TOTALES DEL DÍA */}
      <div>
        <Label className="text-3xl font-bold text-gray-800 mb-6 text-center sm:text-start">
          Resumen de Hoy ({new Date(summary.date).toLocaleDateString()})
        </Label>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <ComponentCard className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center" title={"Ingreso Total Hoy"}>
            <Label className="text-4xl font-extrabold text-gray-900">${summary.totalDay.toFixed(2)}</Label>
          </ComponentCard>

          <ComponentCard className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-6 flex flex-col justify-center items-center" title="Total Efectivo">
            <Label className="text-3xl font-bold" color="text-green-600">${summary.totalCashDay.toFixed(2)}</Label>
          </ComponentCard>

          <ComponentCard className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center items-center" title="Total Tarjeta">
            <Label className="text-3xl font-bold" color="text-blue-600">${summary.totalCardDay.toFixed(2)}</Label>
          </ComponentCard>
          <ComponentCard className="bg-violet-50 rounded-xl shadow-sm border border-violet-100 p-6 flex flex-col justify-center items-center" title="Total Transferencia">
            <Label className="text-3xl font-bold" color="text-violet-600">${summary.totaTransferDay.toFixed(2)}</Label>
          </ComponentCard>
        </div>
      </div>

      {/* TARJETAS POR EMPLEADO */}
      <div>
        <div className="text-2xl font-semibold text-gray-800 mb-4 flex items-center justify-center sm:justify-start gap-2 text-center sm:text-start">
          <Users className="w-6 h-6 text-gray-500" />
          <Label className="">Rendimiento por Empleado</Label>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,320px)] justify-center gap-4">
          {summary.employeeStats.map((emp: any) => (
            <ComponentCard key={emp.id} title={emp.name}>
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
                    <Label>Tarjeta</Label>
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

          ))}

          {summary.employeeStats.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-500">
              No hay empleados registrados en este negocio.
            </div>
          )}
        </div>
      </div>
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
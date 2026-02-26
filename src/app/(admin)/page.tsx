'use client'
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import DemographicCard from "@/components/ecommerce/DemographicCard";

// import { useBusiness } from "@/context/BusinessContext";
import { getBusiness } from "@/lib/getBusiness";



import { useState, useEffect } from 'react'
import { getDailySummary } from '@/lib/prisma'

// Iconos (opcionales, puedes usar lucide-react o heroicons)
import { Users, Banknote, CreditCard, Clock } from 'lucide-react'



// export default async function Ecommerce() {
//   const business = await getBusiness();
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


export default function DailySummaryScreen({ businessId }: { businessId: string }) {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const fetchSummary = async () => {
    const data = await getDailySummary(businessId)
    setSummary(data)
    setLoading(false)
  }
  useEffect(() => {

    fetchSummary()
  }, [businessId])

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
  }, [businessId]); // Pon aquí tus dependencias, como la fecha seleccionada

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
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center sm:text-start">
          Resumen de Hoy ({new Date(summary.date).toLocaleDateString()})
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center items-center">
            <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mb-2">Ingreso Total Hoy</p>
            <p className="text-4xl font-extrabold text-gray-900">${summary.totalDay.toFixed(2)}</p>
          </div>

          <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-6 flex flex-col justify-center items-center">
            <p className="text-green-700 font-medium uppercase tracking-wider text-sm mb-2">Total Efectivo</p>
            <p className="text-3xl font-bold text-green-600">${summary.totalCashDay.toFixed(2)}</p>
          </div>

          <div className="bg-blue-50 rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col justify-center items-center">
            <p className="text-blue-700 font-medium uppercase tracking-wider text-sm mb-2">Total Tarjeta</p>
            <p className="text-3xl font-bold text-blue-600">${summary.totalCardDay.toFixed(2)}</p>
          </div>
          <div className="bg-violet-50 rounded-xl shadow-sm border border-violet-100 p-6 flex flex-col justify-center items-center">
            <p className="text-violet-700 font-medium uppercase tracking-wider text-sm mb-2">Total Transferencia</p>
            <p className="text-3xl font-bold text-violet-600">${summary.totaTransferDay.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* TARJETAS POR EMPLEADO */}
      <div>
        <div className="text-2xl font-semibold text-gray-800 mb-4 flex items-center justify-center sm:justify-start gap-2 text-center sm:text-start">
          <Users className="w-6 h-6 text-gray-500" />
          <h2 className="">Rendimiento por Empleado</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {summary.employeeStats.map((emp: any) => (
            <div key={emp.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              {/* Cabecera de la tarjeta del empleado */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 truncate">{emp.name}</h3>
              </div>

              {/* Cuerpo de la tarjeta */}
              <div className="p-4 space-y-4">

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Banknote className="w-5 h-5 text-green-500" />
                    <span>Efectivo</span>
                  </div>
                  <span className="font-semibold text-gray-900">${emp.cash.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                    <span>Tarjeta</span>
                  </div>
                  <span className="font-semibold text-gray-900">${emp.card.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CreditCard className="w-5 h-5 text-violet-500" />
                    <span>Tarjeta</span>
                  </div>
                  <span className="font-semibold text-gray-900">${emp.transfer.toFixed(2)}</span>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <Clock className="w-5 h-5" />
                    <span>Citas Pendientes</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${emp.pendingAppointments > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.pendingAppointments}
                  </span>
                </div>

              </div>
            </div>
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
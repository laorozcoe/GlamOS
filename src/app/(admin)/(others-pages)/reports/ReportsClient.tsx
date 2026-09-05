'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, PieChart, Users, Scissors, DollarSign, Calendar as CalendarIcon, 
  Download, Loader2, TrendingUp, AlertTriangle, Clock
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import DateField from "@/components/form/DateField";
import { 
  getFinancialMetrics, getClientMetrics, getEmployeeMetrics, getOperationMetrics 
} from './actions';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function ReportsClient() {
  const [activeTab, setActiveTab] = useState('finanzas');
  const [loading, setLoading] = useState(false);
  
  // Rango de fechas por defecto: Mes actual
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Estados de datos
  const [finanzas, setFinanzas] = useState<any>(null);
  const [clientes, setClientes] = useState<any>(null);
  const [empleados, setEmpleados] = useState<any>(null);
  const [operaciones, setOperaciones] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);

      if (activeTab === 'finanzas') {
        const data = await getFinancialMetrics(s, e);
        setFinanzas(data);
      } else if (activeTab === 'clientes') {
        const data = await getClientMetrics(s, e);
        setClientes(data);
      } else if (activeTab === 'empleados') {
        const data = await getEmployeeMetrics(s, e);
        setEmpleados(data);
      } else if (activeTab === 'operaciones') {
        const data = await getOperationMetrics(s, e);
        setOperaciones(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, startDate, endDate]);

  const exportExcel = (data: any[], filename: string) => {
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "Reporte");
    writeFile(wb, `${filename}_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart className="w-6 h-6 text-brand-500" />
            Reportes y Analíticas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Explora el rendimiento de tu negocio</p>
        </div>

        {/* Filtro de Fechas */}
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <CalendarIcon className="w-5 h-5 text-gray-400 ml-2" />
          <DateField
            variant="bare"
            value={startDate}
            onChange={setStartDate}
            containerClassName="w-auto"
            className="text-sm font-medium"
          />
          <span className="text-gray-300 dark:text-gray-600">-</span>
          <DateField
            variant="bare"
            value={endDate}
            onChange={setEndDate}
            containerClassName="w-auto mr-2"
            className="text-sm font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'finanzas', name: 'Finanzas', icon: DollarSign },
          { id: 'clientes', name: 'Clientes', icon: Users },
          { id: 'empleados', name: 'Empleados', icon: Scissors },
          { id: 'operaciones', name: 'Operaciones', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold transition-all ${
              activeTab === tab.id 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-brand-500" />
            <p>Generando reporte...</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* TAB FINANZAS */}
            {activeTab === 'finanzas' && finanzas && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 text-sm font-medium mb-1">Ingresos Brutos</p>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">${finanzas.totalRevenue?.toLocaleString()}</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 text-sm font-medium mb-1">Ticket Promedio</p>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">${Math.round(finanzas.averageTicket || 0).toLocaleString()}</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <button 
                      onClick={() => exportExcel(finanzas.detailedSales, 'Ingresos_Detallados')}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-5 h-5" /> Exportar a Excel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Tendencia de Ingresos</h3>
                    <div className="h-[300px]">
                      {(typeof window !== 'undefined') && (
                        <Chart
                          options={{
                            chart: { type: 'area', toolbar: { show: false }, background: 'transparent' },
                            stroke: { curve: 'smooth', width: 3 },
                            colors: ['#8b5cf6'], // brand-500 aprox
                            xaxis: { categories: finanzas.salesByDay?.map((d: any) => d.date) || [], labels: { style: { colors: '#9ca3af' } } },
                            yaxis: { labels: { formatter: (v: number) => `$${v.toLocaleString()}`, style: { colors: '#9ca3af' } } },
                            dataLabels: { enabled: false },
                            grid: { borderColor: '#374151', strokeDashArray: 4 },
                            theme: { mode: 'dark' } // or light depending on theme
                          }}
                          series={[{ name: 'Ingresos', data: finanzas.salesByDay?.map((d: any) => d.amount) || [] }]}
                          type="area"
                          height="100%"
                        />
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4">Métodos de Pago</h3>
                    <div className="h-[300px] flex items-center justify-center">
                      {(typeof window !== 'undefined') && finanzas.paymentMethodsDistribution && (
                        <Chart
                          options={{
                            chart: { type: 'donut', background: 'transparent' },
                            labels: finanzas.paymentMethodsDistribution.map((d: any) => d.name),
                            colors: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                            legend: { position: 'bottom' },
                            dataLabels: { enabled: false },
                            stroke: { show: false },
                            theme: { mode: 'dark' }
                          }}
                          series={finanzas.paymentMethodsDistribution.map((d: any) => d.value)}
                          type="donut"
                          height="100%"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CLIENTES */}
            {activeTab === 'clientes' && clientes && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 text-sm font-medium mb-1">Nuevos Clientes</p>
                    <h3 className="text-3xl font-black text-brand-600">{clientes.newClientsCount}</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-gray-500 text-sm font-medium mb-1">Clientes Recurrentes (Regresaron)</p>
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">{clientes.returningClientsCount}</h3>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <button 
                      onClick={() => exportExcel(clientes.topClients, 'Top_Clientes')}
                      className="flex items-center justify-center gap-2 w-full py-3 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-5 h-5" /> Exportar VIPs a Excel
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white">Top Clientes (Mayor Gasto)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase">
                        <tr>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Teléfono</th>
                          <th className="px-6 py-4 text-center">Visitas</th>
                          <th className="px-6 py-4 text-right">Dinero Gastado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientes.topClients?.map((c: any, i: number) => (
                          <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-6 py-4 font-bold dark:text-white flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs">#{i+1}</span>
                              {c.name}
                            </td>
                            <td className="px-6 py-4 text-gray-500">{c.phone || 'N/A'}</td>
                            <td className="px-6 py-4 text-center font-medium">{c.visitsCount}</td>
                            <td className="px-6 py-4 text-right text-brand-600 font-black">${c.totalSpent.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB EMPLEADOS */}
            {activeTab === 'empleados' && empleados && (
              <div className="space-y-6">
                <div className="flex justify-end">
                   <button 
                      onClick={() => exportExcel(empleados.employeeProductivity, 'Productividad_Empleados')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-bold rounded-xl hover:bg-green-100 transition-colors"
                    >
                      <Download className="w-5 h-5" /> Exportar Productividad
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {empleados.employeeProductivity?.map((emp: any) => (
                    <div key={emp.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-white">{emp.name}</h3>
                          <p className="text-gray-500 text-sm">{emp.servicesCount} servicios realizados</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider mb-1">Generado</p>
                        <h4 className="text-2xl font-black text-brand-600">${emp.revenueGenerated.toLocaleString()}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB OPERACIONES */}
            {activeTab === 'operaciones' && operaciones && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Horas Pico */}
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" /> Horas de mayor flujo (Ventas)
                    </h3>
                    <div className="h-[300px]">
                      {(typeof window !== 'undefined') && (
                        <Chart
                          options={{
                            chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
                            colors: ['#f97316'],
                            xaxis: { 
                              categories: operaciones.peakHours?.map((d: any) => `${d.hour}:00`) || [],
                              labels: { style: { colors: '#9ca3af' } } 
                            },
                            yaxis: { labels: { style: { colors: '#9ca3af' } } },
                            plotOptions: { bar: { borderRadius: 4 } },
                            dataLabels: { enabled: false },
                            theme: { mode: 'dark' }
                          }}
                          series={[{ name: 'Cobros realizados', data: operaciones.peakHours?.map((d: any) => d.count) || [] }]}
                          type="bar"
                          height="100%"
                        />
                      )}
                    </div>
                  </div>

                  {/* Top Servicios */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-pink-500" /> Servicios más vendidos
                      </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {operaciones.topServices?.map((srv: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-pink-50 dark:bg-pink-900/30 text-pink-600 font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-medium dark:text-white">{srv.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900 dark:text-white">{srv.quantitySold} vend.</p>
                            <p className="text-xs text-green-500 font-bold">${srv.revenueGenerated.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

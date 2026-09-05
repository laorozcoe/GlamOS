"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPayrollData } from "./actions";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);

const formatDateObj = (dateString: string) =>
  new Date(dateString).toLocaleDateString("es-MX", { month: "short", day: "numeric" });

const formatTimeObj = (dateString: string) =>
  new Date(dateString).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

type Bono = {
  ruleId: string;
  nombre: string;
  tipo: string;
  monto: number;
  ganado: boolean;
  motivo: string;
  manual: boolean;
  ajustado: boolean;
};

type Fila = {
  employeeId: string;
  name: string;
  role: string;
  baseSalary: number;
  commissionPercentage: number;
  totalSalesGenerated: number;
  commissionPay: number;
  bonos: Bono[];
  bonosTotal: number;
  totalPay: number;
  sales: any[];
};

const colorDeRol = (role: string) => {
  if (role === "RECEPTION") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  if (role === "ADMIN") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
  return "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400";
};

/**
 * Los bonos del periodo, ganados y NO ganados.
 *
 * Los que no se ganaron se muestran igual, con el motivo: saber por que no se
 * pago es la mitad de para lo que sirve la pantalla, y es lo que se le
 * responde a la empleada cuando pregunta.
 */
function ListaDeBonos({ bonos, detallado = false }: { bonos: Bono[]; detallado?: boolean }) {
  if (!bonos?.length) return null;

  return (
    <div className="space-y-2">
      {bonos.map((b) => (
        <div key={b.ruleId} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className={b.ganado ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
              {b.nombre}
            </span>
            {b.ajustado && (
              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                ajustado
              </span>
            )}
            {(detallado || !b.ganado) && (
              <div className="mt-0.5 text-xs text-gray-400">{b.motivo}</div>
            )}
          </div>
          <span
            className={`shrink-0 font-semibold tabular-nums ${
              b.ganado
                ? "text-success-600 dark:text-success-400"
                : "text-gray-300 line-through dark:text-gray-600"
            }`}
          >
            {b.ganado ? "+" : ""}
            {formatCurrency(b.monto)}
          </span>
        </div>
      ))}

      {detallado && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-sm dark:border-white/5">
          <span className="font-medium text-gray-700 dark:text-gray-300">Total en bonos</span>
          <span className="font-bold tabular-nums text-gray-900 dark:text-white">
            {formatCurrency(bonos.reduce((acc, b) => acc + (b.ganado ? b.monto : 0), 0))}
          </span>
        </div>
      )}
    </div>
  );
}

export default function PayrollClient() {
  const [fechaRef, setFechaRef] = useState<Date>(() => new Date());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seleccionado, setSeleccionado] = useState<Fila | null>(null);

  const cargar = useCallback(async (fecha: Date) => {
    setLoading(true);
    try {
      // Solo se manda el dia de referencia: el corte de la semana lo resuelve
      // el servidor con el dia que el salon eligio en Configuracion.
      setData(await getPayrollData(new Date(fecha).toISOString()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(fechaRef);
  }, [fechaRef, cargar]);

  const moverSemana = (offset: number) => {
    const nueva = new Date(fechaRef);
    nueva.setDate(nueva.getDate() + offset * 7);
    setFechaRef(nueva);
  };

  const filas: Fila[] = data?.payrollData ?? [];
  const totalNomina = filas.reduce((acc, f) => acc + f.totalPay, 0);

  const columnas: Column<Fila>[] = [
    {
      key: "empleado",
      header: "Empleado",
      primary: true,
      cell: (f) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{f.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${colorDeRol(f.role)}`}>
              {f.role}
            </span>
            <span className="text-xs text-gray-500">Comisión {f.commissionPercentage}%</span>
          </div>
        </div>
      ),
    },
    {
      key: "base",
      header: "Sueldo base",
      align: "right",
      cell: (f) => (
        <span className="tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(f.baseSalary)}</span>
      ),
    },
    {
      key: "comisiones",
      header: "Comisiones",
      align: "right",
      cell: (f) => (
        <div className="text-right">
          <div className="tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(f.commissionPay)}</div>
          <div className="text-xs text-gray-400">sobre {formatCurrency(f.totalSalesGenerated)}</div>
        </div>
      ),
    },
    {
      key: "bonos",
      header: "Bonos",
      align: "right",
      cell: (f) => {
        const ganados = f.bonos.filter((b) => b.ganado).length;
        if (f.bonos.length === 0) {
          return <span className="text-xs text-gray-400">sin bonos</span>;
        }
        return (
          <div className="text-right">
            <div className="tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(f.bonosTotal)}</div>
            <div className="text-xs text-gray-400">
              {ganados} de {f.bonos.length}
            </div>
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total a pagar",
      align: "right",
      cell: (f) => (
        <span className="text-base font-bold tabular-nums text-gray-900 dark:text-white">
          {formatCurrency(f.totalPay)}
        </span>
      ),
    },
  ];

  return (
    <PageShell
      title={
        data ? `Semana del ${formatDateObj(data.startDate)} al ${formatDateObj(data.endDate)}` : "Cargando…"
      }
      description={
        filas.length > 0 ? `${filas.length} personas · ${formatCurrency(totalNomina)} en total` : undefined
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => moverSemana(-1)} className="h-11">
            <ChevronLeft className="size-4" />
            <span className="ml-1 hidden sm:inline">Anterior</span>
          </Button>
          <Button variant="outline" onClick={() => moverSemana(1)} className="h-11">
            <span className="mr-1 hidden sm:inline">Siguiente</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      <DataTable
        columns={columnas}
        rows={filas}
        rowKey={(f) => f.employeeId}
        onRowClick={(f) => setSeleccionado(f)}
        loading={loading && filas.length === 0}
        empty="No hay empleados activos registrados para el negocio."
        cardFooter={(f) => (
          <Button variant="outline" className="w-full" onClick={() => setSeleccionado(f)}>
            Ver detalle
          </Button>
        )}
      />

      <Modal
        isOpen={!!seleccionado}
        onClose={() => setSeleccionado(null)}
        className="max-w-3xl sm:h-[85svh] p-0 flex flex-col"
        mobileVariant="fullscreen"
      >
        {seleccionado && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 pb-4 pr-16 pt-5 dark:border-white/5 sm:px-6 sm:pr-20 sm:pt-6">
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white/90">{seleccionado.name}</h3>
                <p className="text-sm text-gray-500">
                  {formatDateObj(data.startDate)} al {formatDateObj(data.endDate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="block text-2xl font-bold text-brand-600">
                  {formatCurrency(seleccionado.totalPay)}
                </span>
                <span className="text-xs text-gray-500">Total de la semana</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/2">
                  <p className="text-xs text-gray-500">Sueldo base</p>
                  <p className="font-semibold text-gray-800 dark:text-white/90">
                    {formatCurrency(seleccionado.baseSalary)}
                  </p>
                </div>
                <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-900/10">
                  <p className="text-xs text-brand-600 dark:text-brand-400">
                    Comisiones ({seleccionado.commissionPercentage}%)
                  </p>
                  <p className="font-semibold text-brand-700 dark:text-brand-300">
                    {formatCurrency(seleccionado.commissionPay)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/2">
                  <p className="text-xs text-gray-500">Bonos</p>
                  <p className="font-semibold text-gray-800 dark:text-white/90">
                    {formatCurrency(seleccionado.bonosTotal)}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-white/2">
                  <p className="text-xs text-gray-500">Tickets</p>
                  <p className="font-semibold text-gray-800 dark:text-white/90">{seleccionado.sales.length}</p>
                </div>
              </div>

              {seleccionado.bonos.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-3 border-b border-gray-200 pb-2 font-semibold text-gray-700 dark:border-white/5 dark:text-gray-300">
                    Bonos del periodo
                  </h4>
                  <ListaDeBonos bonos={seleccionado.bonos} detallado />
                </div>
              )}

              <h4 className="mb-3 border-b border-gray-200 pb-2 font-semibold text-gray-700 dark:border-white/5 dark:text-gray-300">
                Tickets de la semana
              </h4>

              {seleccionado.sales.length > 0 ? (
                <div className="space-y-3">
                  {seleccionado.sales.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 dark:border-white/5 dark:bg-transparent"
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block font-medium text-gray-800 dark:text-white/90">
                            Folio #{sale.folio}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateObj(sale.createdAt)} a las {formatTimeObj(sale.createdAt)}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="block font-bold tabular-nums text-gray-900 dark:text-white">
                            {formatCurrency(sale.total)}
                          </span>
                          <span className="text-xs font-medium text-success-600">
                            + {formatCurrency(sale.comision)} de comisión
                          </span>
                        </div>
                      </div>
                      <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
                        {sale.items.map((item: any) => (
                          <li key={item.id}>
                            {item.quantity}x {item.description} — {formatCurrency(item.price)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500">
                  Esta persona no registró ninguna venta esta semana.
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-4 dark:border-white/5">
              <Button variant="outline" className="w-full" onClick={() => setSeleccionado(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { ChevronLeft, ChevronRight, Pencil, RotateCcw, Lock, LockOpen } from "lucide-react";
import { toast } from "react-toastify";
import { useSession } from "@/lib/auth-client";
import {
  getPayrollData,
  setBonusAward,
  clearBonusAward,
  cerrarNominaAction,
  reabrirNominaAction,
} from "./actions";

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
  montoCatalogo: number;
  ganado: boolean;
  /** Lo que dijo el calculo antes de cualquier ajuste. null en los manuales. */
  calculado: boolean | null;
  motivo: string;
  manual: boolean;
  ajustado: boolean;
  /** Ya hay una decision manual guardada para este bono en este periodo. */
  decidido: boolean;
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
function ListaDeBonos({
  bonos,
  detallado = false,
  onEditar,
}: {
  bonos: Bono[];
  detallado?: boolean;
  onEditar?: (b: Bono) => void;
}) {
  if (!bonos?.length) return null;

  return (
    <div className="space-y-2">
      {bonos.map((b) => (
        <div key={b.ruleId} className="flex items-start justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className={b.ganado ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
              {b.nombre}
            </span>
            {b.manual && (
              <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-white/10 dark:text-gray-400">
                a criterio
              </span>
            )}
            {b.ajustado && (
              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                ajustado
              </span>
            )}
            {(detallado || !b.ganado) && (
              <div className="mt-0.5 text-xs text-gray-400">{b.motivo}</div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`font-semibold tabular-nums ${
                b.ganado
                  ? "text-success-600 dark:text-success-400"
                  : "text-gray-300 line-through dark:text-gray-600"
              }`}
            >
              {b.ganado ? "+" : ""}
              {formatCurrency(b.monto)}
            </span>
            {onEditar && (
              <button
                onClick={() => onEditar(b)}
                aria-label={`Cambiar ${b.nombre}`}
                className="flex size-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
          </div>
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
  const [seleccionadoId, setSeleccionadoId] = useState<string | null>(null);

  // El bono que se esta otorgando o ajustando, y su formulario.
  const [bonoEnEdicion, setBonoEnEdicion] = useState<Bono | null>(null);
  const [otorgar, setOtorgar] = useState(true);
  const [montoBono, setMontoBono] = useState<string>("");
  const [notaBono, setNotaBono] = useState<string>("");
  const [guardandoBono, setGuardandoBono] = useState(false);

  // Cerrar o reabrir la semana. Las dos piden confirmacion: son las dos
  // operaciones de la pantalla que cambian que numeros manda.
  const [confirmacion, setConfirmacion] = useState<"cerrar" | "reabrir" | null>(null);
  const [cerrando, setCerrando] = useState(false);

  // Recepcion puede LEER la nomina pero no otorgar bonos. Sin esto veria un
  // lapiz que solo lleva a un error de permisos.
  const { data: sesion } = useSession();
  const puedeOtorgar = (sesion?.session as any)?.role === "ADMIN";

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
  const cerrada: boolean = !!data?.cerrada;
  // Derivado, no copiado: al recargar tras otorgar un bono, el detalle abierto
  // se actualiza solo en vez de quedarse con los numeros viejos.
  const seleccionado = filas.find((f) => f.employeeId === seleccionadoId) ?? null;

  const abrirBono = (bono: Bono) => {
    setBonoEnEdicion(bono);
    setOtorgar(bono.ganado);
    setMontoBono(String(bono.monto ?? bono.montoCatalogo ?? 0));
    setNotaBono("");
  };

  const guardarBono = async () => {
    if (!bonoEnEdicion || !seleccionadoId) return;
    setGuardandoBono(true);
    try {
      const monto = Number(montoBono);
      await setBonusAward({
        employeeId: seleccionadoId,
        ruleId: bonoEnEdicion.ruleId,
        referenceDateISO: new Date(fechaRef).toISOString(),
        granted: otorgar,
        // Si coincide con el catalogo no se guarda monto: asi el bono sigue
        // los cambios del catalogo en vez de quedar congelado.
        amount: monto === bonoEnEdicion.montoCatalogo ? null : monto,
        note: notaBono,
      });
      setBonoEnEdicion(null);
      await cargar(fechaRef);
      toast.success(otorgar ? "Bono otorgado." : "Bono retirado.");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo guardar el bono.");
    } finally {
      setGuardandoBono(false);
    }
  };

  const cerrarSemana = async () => {
    setCerrando(true);
    try {
      await cerrarNominaAction(new Date(fechaRef).toISOString());
      setConfirmacion(null);
      await cargar(fechaRef);
      toast.success("Nómina cerrada.");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo cerrar la nómina.");
    } finally {
      setCerrando(false);
    }
  };

  const reabrirSemana = async () => {
    setCerrando(true);
    try {
      await reabrirNominaAction(new Date(fechaRef).toISOString());
      setConfirmacion(null);
      await cargar(fechaRef);
      toast.success("Nómina reabierta.");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo reabrir la nómina.");
    } finally {
      setCerrando(false);
    }
  };

  const quitarAjuste = async () => {
    if (!bonoEnEdicion || !seleccionadoId) return;
    setGuardandoBono(true);
    try {
      await clearBonusAward(seleccionadoId, bonoEnEdicion.ruleId, new Date(fechaRef).toISOString());
      setBonoEnEdicion(null);
      await cargar(fechaRef);
      toast.success("Se quitó la decisión manual.");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo quitar el ajuste.");
    } finally {
      setGuardandoBono(false);
    }
  };

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
        // Los manuales sin decidir son trabajo pendiente: hay que verlos sin
        // abrir a cada persona.
        const porDecidir = f.bonos.filter((b) => b.manual && !b.decidido).length;
        if (f.bonos.length === 0) {
          return <span className="text-xs text-gray-400">sin bonos</span>;
        }
        return (
          <div className="text-right">
            <div className="tabular-nums text-gray-700 dark:text-gray-300">{formatCurrency(f.bonosTotal)}</div>
            <div className="text-xs text-gray-400">
              {ganados} de {f.bonos.length}
            </div>
            {porDecidir > 0 && (
              <div className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {porDecidir} por decidir
              </div>
            )}
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
          {puedeOtorgar && !cerrada && filas.length > 0 && (
            <Button onClick={() => setConfirmacion("cerrar")} className="h-11">
              <Lock className="mr-2 size-4" /> Cerrar nómina
            </Button>
          )}
        </div>
      }
    >
      {cerrada && (
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 size-4 shrink-0 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white/90">Semana cerrada</p>
              <p className="text-xs text-gray-500">
                Estos son los montos que se pagaron
                {data.cerradaPor ? `, según los cerró ${data.cerradaPor}` : ""}
                {data.cerradaEl
                  ? ` el ${new Date(data.cerradaEl).toLocaleDateString("es-MX", {
                      day: "numeric",
                      month: "long",
                    })}`
                  : ""}
                . Ya no se recalculan.
              </p>
            </div>
          </div>
          {puedeOtorgar && (
            <Button variant="outline" onClick={() => setConfirmacion("reabrir")} className="shrink-0">
              <LockOpen className="mr-2 size-4" /> Reabrir
            </Button>
          )}
        </div>
      )}
      <DataTable
        columns={columnas}
        rows={filas}
        rowKey={(f) => f.employeeId}
        onRowClick={(f) => setSeleccionadoId(f.employeeId)}
        loading={loading && filas.length === 0}
        empty="No hay empleados activos registrados para el negocio."
        cardFooter={(f) => (
          <Button variant="outline" className="w-full" onClick={() => setSeleccionadoId(f.employeeId)}>
            Ver detalle
          </Button>
        )}
      />

      <Modal
        isOpen={!!seleccionado}
        onClose={() => setSeleccionadoId(null)}
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
                  <ListaDeBonos
                    bonos={seleccionado.bonos}
                    detallado
                    onEditar={puedeOtorgar && !cerrada ? abrirBono : undefined}
                  />
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
              <Button variant="outline" className="w-full" onClick={() => setSeleccionadoId(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Otorgar un bono manual, o contradecir al calculo a sabiendas */}
      <Modal isOpen={!!bonoEnEdicion} onClose={() => setBonoEnEdicion(null)} size="md" className="p-0">
        {bonoEnEdicion && (
          <div className="w-full">
            <div className="border-b border-gray-200 px-5 pb-4 pr-16 pt-5 dark:border-gray-800 sm:px-6 sm:pr-20 sm:pt-6">
              <Label className="text-lg font-semibold">{bonoEnEdicion.nombre}</Label>
              <p className="mt-0.5 text-sm text-gray-500">
                {seleccionado?.name} · {formatDateObj(data.startDate)} al {formatDateObj(data.endDate)}
              </p>
            </div>

            <div className="space-y-4 p-5 sm:p-6">
              {/* Lo que dijo el calculo, para que quien decide sepa que esta
                  contradiciendo y no lo haga sin querer. */}
              {bonoEnEdicion.calculado !== null && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/5">
                  <span className="text-gray-500">El cálculo dice: </span>
                  <span className={bonoEnEdicion.calculado ? "font-medium text-success-600" : "font-medium text-gray-700 dark:text-gray-300"}>
                    {bonoEnEdicion.calculado ? "se gana" : "no se gana"}
                  </span>
                  <div className="mt-0.5 text-xs text-gray-400">{bonoEnEdicion.motivo}</div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setOtorgar(true)}
                  className={`min-h-11 flex-1 rounded-lg border px-4 text-sm font-semibold transition-colors ${
                    otorgar
                      ? "border-success-500 bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  Otorgar
                </button>
                <button
                  onClick={() => setOtorgar(false)}
                  className={`min-h-11 flex-1 rounded-lg border px-4 text-sm font-semibold transition-colors ${
                    !otorgar
                      ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                  }`}
                >
                  No otorgar
                </button>
              </div>

              {otorgar && (
                <div>
                  <Label className="mb-1 block text-sm font-medium">Monto</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="number"
                      min="0"
                      value={montoBono}
                      onChange={(e) => setMontoBono(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    El catálogo dice {formatCurrency(bonoEnEdicion.montoCatalogo)}. Cámbialo solo por excepción.
                  </p>
                </div>
              )}

              <div>
                <Label className="mb-1 block text-sm font-medium">
                  Motivo {bonoEnEdicion.manual ? "(opcional)" : "(obligatorio)"}
                </Label>
                <TextArea
                  rows={2}
                  placeholder={
                    bonoEnEdicion.manual
                      ? "Presentación impecable toda la semana."
                      : "Por qué se cambia lo que calculó el sistema."
                  }
                  value={notaBono}
                  onChange={(e) => setNotaBono(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Es lo que se lee después, cuando alguien pregunta por qué esta semana pagó distinto.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                {bonoEnEdicion.decidido ? (
                  <Button variant="outline" onClick={quitarAjuste} disabled={guardandoBono}>
                    <RotateCcw className="mr-2 size-4" /> Quitar decisión
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => setBonoEnEdicion(null)}>
                  Cancelar
                </Button>
                <Button onClick={guardarBono} disabled={guardandoBono}>
                  {guardandoBono ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Cerrar o reabrir la semana */}
      <Modal isOpen={!!confirmacion} onClose={() => setConfirmacion(null)} size="sm" className="p-6">
        {confirmacion === "cerrar" ? (
          <>
            <Label className="mb-2 block text-lg font-bold">¿Cerrar esta semana?</Label>
            <p className="mb-2 text-sm text-gray-500">
              Se guardan {formatCurrency(totalNomina)} repartidos entre {filas.length} personas, tal como
              se ven ahora.
            </p>
            <p className="mb-6 text-sm text-gray-500">
              Después de cerrar, la semana deja de recalcularse: si más adelante cancelas o corriges una
              venta de estos días, lo que ya pagaste no se mueve. Tampoco se podrán cambiar bonos sin
              reabrirla.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmacion(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={cerrarSemana} disabled={cerrando}>
                {cerrando ? "Cerrando..." : "Cerrar nómina"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Label className="mb-2 block text-lg font-bold">¿Reabrir esta semana?</Label>
            <p className="mb-6 text-sm text-gray-500">
              Se borra lo guardado y la nómina vuelve a calcularse con los datos de hoy. Si alguna venta
              de esos días cambió desde que la cerraste, los montos van a salir distintos a los que
              pagaste.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmacion(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700"
                onClick={reabrirSemana}
                disabled={cerrando}
              >
                {cerrando ? "Reabriendo..." : "Reabrir"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </PageShell>
  );
}

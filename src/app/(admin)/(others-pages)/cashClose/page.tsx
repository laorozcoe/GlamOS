"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Banknote, CreditCard, ArrowLeftRight, Lock } from "lucide-react";

import { getCashCloseSummary, createCashClose } from "@/lib/prisma";
import { useBusiness } from "@/context/BusinessContext";
import PageShell from "@/components/layout/PageShell";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import TextArea from "@/components/form/input/TextArea";

type Resumen = {
  openingDate: string | Date;
  closingDate: string | Date;
  cashExpected: number;
  cardTotal: number;
  transferTotal: number;
  totalSales: number;
  salesCount: number;
};

const money = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

export default function CashCloseScreen() {
  const business = useBusiness();

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [notas, setNotas] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!business?.id) return;

    let cancelado = false;
    (async () => {
      setCargando(true);
      try {
        const data = await getCashCloseSummary(business.id);
        if (!cancelado) setResumen(data as Resumen);
      } catch (e) {
        console.error(e);
        toast.error("No se pudo calcular el corte.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [business?.id]);

  const contado = efectivoContado === "" ? null : Number(efectivoContado);
  const diferencia = contado === null ? 0 : contado - (resumen?.cashExpected ?? 0);
  const falta = diferencia < 0;
  const sobra = diferencia > 0;

  const cerrarCaja = async () => {
    if (contado === null || Number.isNaN(contado)) {
      toast.error("Escribe cuánto efectivo contaste en la caja.");
      return;
    }
    if (!resumen) return;

    setGuardando(true);
    try {
      // businessId y userId los pone el servidor a partir de la sesión: antes
      // se mandaban desde aquí y `businessId` ni siquiera estaba definido, así
      // que esta función SIEMPRE lanzaba ReferenceError y el corte no se
      // guardaba nunca. Al ser un .jsx, el typecheck no lo veía.
      await createCashClose({
        openingDate: resumen.openingDate,
        cashExpected: resumen.cashExpected,
        cashActual: contado,
        notes: notas,
      });

      toast.success("Corte de caja guardado.");
      setEfectivoContado("");
      setNotas("");

      const data = await getCashCloseSummary(business?.id);
      setResumen(data as Resumen);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar el corte.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return <div className="py-12 text-center text-gray-500">Calculando ventas del turno...</div>;
  }

  if (!resumen) {
    return <div className="py-12 text-center text-gray-500">No hay datos del turno.</div>;
  }

  return (
    <PageShell
      title="Corte de Caja"
      description={`Turno abierto el ${new Date(resumen.openingDate).toLocaleString("es-MX")} · ${resumen.salesCount} ticket(s)`}
      className="mx-auto max-w-xl"
    >
      {/* Ingresos del turno */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Efectivo", valor: resumen.cashExpected, Icon: Banknote },
          { label: "Tarjeta", valor: resumen.cardTotal, Icon: CreditCard },
          { label: "Transferencia", valor: resumen.transferTotal, Icon: ArrowLeftRight },
        ].map(({ label, valor, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/3"
          >
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-gray-500">
              <Icon className="size-4" /> {label}
            </div>
            <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-white">
              {money(valor)}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/3">
        <span className="text-sm font-bold uppercase text-gray-500">Total del turno</span>
        <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-white">
          {money(resumen.totalSales)}
        </span>
      </div>

      {/* Lo único que se cuenta a mano */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900/50 dark:bg-brand-900/15">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Efectivo esperado en el cajón
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums text-brand-700 dark:text-brand-300">
          {money(resumen.cashExpected)}
        </p>
      </div>

      <div>
        <Label htmlFor="efectivo" className="mb-1.5">
          ¿Cuánto efectivo contaste físicamente?
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
            $
          </span>
          <input
            id="efectivo"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={efectivoContado}
            onChange={(e) => setEfectivoContado(e.target.value)}
            // h-14 y texto grande: se teclea de pie, al cerrar el salón.
            className="h-14 w-full rounded-xl border border-gray-300 bg-transparent pl-9 pr-4 text-2xl font-bold tabular-nums text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      </div>

      {contado !== null && (
        <div
          className={`rounded-2xl border p-4 ${
            falta
              ? "border-error-200 bg-error-50 text-error-700 dark:border-error-900/50 dark:bg-error-900/15 dark:text-error-400"
              : sobra
                ? "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-900/50 dark:bg-warning-900/15 dark:text-warning-400"
                : "border-success-200 bg-success-50 text-success-700 dark:border-success-900/50 dark:bg-success-900/15 dark:text-success-400"
          }`}
        >
          <p className="flex items-center justify-between text-lg font-bold">
            <span>Diferencia</span>
            <span className="tabular-nums">{money(Math.abs(diferencia))}</span>
          </p>
          <p className="mt-1 text-sm opacity-80">
            {falta && "Falta dinero en la caja."}
            {sobra && "Sobra dinero en la caja."}
            {diferencia === 0 && "Caja cuadrada."}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="notas" className="mb-1.5">
          Notas del corte (opcional)
        </Label>
        <TextArea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Justificación de faltantes o sobrantes..."
        />
      </div>

      <Button
        onClick={cerrarCaja}
        disabled={guardando || efectivoContado === ""}
        className="h-14 w-full text-base"
      >
        <Lock className="mr-2 size-4" />
        {guardando ? "Guardando..." : "Cerrar caja"}
      </Button>
    </PageShell>
  );
}

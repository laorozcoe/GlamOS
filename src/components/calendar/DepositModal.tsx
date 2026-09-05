"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { toast } from "react-toastify";
import { getSaldoDeCita, registrarAnticipo } from "@/lib/anticipos";

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);

const METODOS = [
  { valor: "CASH", etiqueta: "Efectivo" },
  { valor: "CARD", etiqueta: "Tarjeta" },
  { valor: "TRANSFER", etiqueta: "Transfe." },
] as const;

interface Props {
  isOpen: boolean;
  /** Cita sobre la que se registra. Si es null el modal no pide nada. */
  appointmentId: string | null;
  onClose: () => void;
  /** Se llama al terminar, con o sin anticipo, para recargar la agenda. */
  onDone: () => void;
  /** Imprime el comprobante. Si no hay impresora devuelve false y no pasa nada. */
  onPrint?: (datos: any) => Promise<boolean | void>;
  businessName: string;
}

/**
 * Anticipo al agendar.
 *
 * Registrar el anticipo ABRE la venta de la cita: el dinero entra a la caja
 * hoy y el dia de la cita se cobra solo el saldo sobre esa misma venta.
 *
 * "Sin anticipo" cierra sin escribir nada: el paso se puede omitir siempre,
 * porque en la mayoria de las citas no hay anticipo.
 */
export default function DepositModal({
  isOpen,
  appointmentId,
  onClose,
  onDone,
  onPrint,
  businessName,
}: Props) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [total, setTotal] = useState(0);
  const [anticipado, setAnticipado] = useState(0);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<"CASH" | "CARD" | "TRANSFER">("CASH");

  // `onClose` NO va en las dependencias: llega como funcion anonima creada en
  // cada render del padre, asi que su identidad cambia siempre. Tenerla aqui
  // repetia el efecto sin parar -cargaba, re-renderizaba, volvia a cargar- y
  // el modal se quedaba en "Leyendo el saldo..." parpadeando. Se usa a traves
  // de una ref para leer siempre la ultima sin provocar el ciclo.
  const cerrarRef = useRef(onClose);
  useEffect(() => {
    cerrarRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !appointmentId) return;
    let vigente = true;

    (async () => {
      setCargando(true);
      setMonto("");
      setMetodo("CASH");
      try {
        const s = await getSaldoDeCita(appointmentId);
        if (!vigente) return;
        setTotal(s.total);
        setAnticipado(s.anticipado);
        setSaldo(s.saldo);
      } catch (e: any) {
        toast.error(e?.message || "No se pudo leer el saldo de la cita.");
        cerrarRef.current();
      } finally {
        if (vigente) setCargando(false);
      }
    })();

    return () => {
      vigente = false;
    };
  }, [isOpen, appointmentId]);

  const guardar = async () => {
    if (!appointmentId) return;
    setGuardando(true);
    try {
      const resumen = await registrarAnticipo({
        appointmentId,
        amount: Number(monto),
        method: metodo,
      });

      toast.success(`Anticipo de ${pesos(resumen.anticipado - anticipado)} registrado.`);

      // El ticket es lo ultimo y no bloquea: si la impresora no esta, el
      // anticipo ya quedo guardado igual.
      if (onPrint) {
        const inicio = new Date(resumen.fecha);
        const fin = new Date(resumen.fin);
        await onPrint({
          businessName,
          folio: resumen.folio,
          fecha: inicio.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }),
          hora: inicio.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          horaFin: fin.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }),
          especialista: resumen.especialista,
          cliente: resumen.cliente,
          servicios: resumen.servicios,
          total: resumen.total,
          anticipado: resumen.anticipado,
          saldo: resumen.saldo,
          metodo: resumen.metodo,
        }).catch(() => false);
      }

      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo registrar el anticipo.");
    } finally {
      setGuardando(false);
    }
  };

  const montoNum = Number(monto) || 0;
  const invalido = montoNum <= 0 || montoNum > saldo;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" className="p-0">
      <div className="w-full">
        <div className="border-b border-gray-200 px-5 pb-4 pr-16 pt-5 dark:border-gray-800 sm:px-6 sm:pr-20 sm:pt-6">
          <Label className="text-lg font-semibold">¿Dejó anticipo?</Label>
          <p className="mt-0.5 text-sm text-gray-500">
            La cita ya quedó agendada. Esto es solo el dinero que dejó a cuenta.
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {cargando ? (
            <p className="py-6 text-center text-sm text-gray-500">Leyendo el saldo…</p>
          ) : (
            <>
              <div className="flex items-baseline justify-between rounded-lg bg-gray-50 p-3 dark:bg-white/5">
                <span className="text-sm text-gray-500">Total de la cita</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
                  {pesos(total)}
                </span>
              </div>
              {anticipado > 0 && (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-gray-500">Ya tenía anticipado</span>
                  <span className="tabular-nums text-gray-700 dark:text-gray-300">{pesos(anticipado)}</span>
                </div>
              )}

              <div>
                <Label className="mb-1 block text-sm font-medium">Monto del anticipo</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Máximo {pesos(saldo)}, que es lo que se debe.
                </p>
              </div>

              <div>
                <Label className="mb-1 block text-sm font-medium">Cómo pagó</Label>
                <div className="flex gap-2">
                  {METODOS.map((m) => (
                    <button
                      key={m.valor}
                      onClick={() => setMetodo(m.valor)}
                      className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold transition-colors ${
                        metodo === m.valor
                          ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
                      }`}
                    >
                      {m.etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose} disabled={guardando}>
                  Sin anticipo
                </Button>
                <Button className="flex-1" onClick={guardar} disabled={guardando || invalido}>
                  {guardando ? "Guardando..." : "Registrar"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

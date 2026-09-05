"use client";

import React, { useCallback, useEffect, useState } from "react";
import PageShell from "@/components/layout/PageShell";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import Select from "@/components/form/Select";
import { Plus, Pencil, Trash2, Clock, Scissors, Banknote, Users, HandHeart } from "lucide-react";
import { toast } from "react-toastify";
import {
  getBonusRules,
  createBonusRule,
  updateBonusRule,
  deleteBonusRule,
  toggleBonusRule,
  type DatosBono,
} from "./actions";

type Bono = DatosBono & { id: string; active: boolean };

const TIPOS = [
  { value: "PUNCTUALITY", label: "Puntualidad" },
  { value: "SERVICES", label: "Cantidad de servicios" },
  { value: "REVENUE", label: "Dinero vendido" },
  { value: "CLIENTS", label: "Clientes atendidos" },
  { value: "MANUAL", label: "Manual (se otorga a criterio)" },
];

const ICONO: Record<string, React.ReactNode> = {
  PUNCTUALITY: <Clock className="size-4" />,
  SERVICES: <Scissors className="size-4" />,
  REVENUE: <Banknote className="size-4" />,
  CLIENTS: <Users className="size-4" />,
  MANUAL: <HandHeart className="size-4" />,
};

/** Lo que hay que alcanzar, dicho en las unidades de cada tipo. */
const UNIDAD_META: Record<string, { etiqueta: string; sufijo: string; prefijo: string }> = {
  SERVICES: { etiqueta: "Servicios a alcanzar", sufijo: "servicios", prefijo: "" },
  REVENUE: { etiqueta: "Dinero a vender", sufijo: "", prefijo: "$" },
  CLIENTS: { etiqueta: "Clientes a atender", sufijo: "clientes", prefijo: "" },
};

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const VACIO: DatosBono = {
  name: "",
  description: "",
  type: "PUNCTUALITY",
  amount: 0,
  goal: null,
  maxLates: 0,
  maxAbsences: 0,
  active: true,
};

/** Cómo se gana el bono, en una frase. Es lo que se le explica al empleado. */
function comoSeGana(bono: Bono): string {
  switch (bono.type) {
    case "PUNCTUALITY": {
      const retardos = bono.maxLates === 0 ? "sin retardos" : `hasta ${bono.maxLates} retardos`;
      const faltas = bono.maxAbsences === 0 ? "sin faltas" : `hasta ${bono.maxAbsences} faltas`;
      return `${retardos} y ${faltas} en el periodo`;
    }
    case "SERVICES":
      return `${bono.goal ?? 0} servicios o más en el periodo`;
    case "REVENUE":
      return `${pesos(bono.goal ?? 0)} vendidos o más en el periodo`;
    case "CLIENTS":
      return `${bono.goal ?? 0} clientes distintos o más`;
    case "MANUAL":
      return "se otorga a criterio, en la nómina";
    default:
      return "";
  }
}

export default function BonusRulesClient() {
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Bono | null>(null);
  const [form, setForm] = useState<DatosBono>(VACIO);
  const [porBorrar, setPorBorrar] = useState<Bono | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setBonos((await getBonusRules()) as Bono[]);
    } catch (e) {
      console.error(e);
      toast.error("No se pudieron cargar los bonos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(VACIO);
    setAbierto(true);
  };

  const abrirEdicion = (bono: Bono) => {
    setEditando(bono);
    setForm({
      name: bono.name,
      description: bono.description ?? "",
      type: bono.type,
      amount: bono.amount,
      goal: bono.goal ?? null,
      maxLates: bono.maxLates ?? 0,
      maxAbsences: bono.maxAbsences ?? 0,
      active: bono.active,
    });
    setAbierto(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      if (editando) await updateBonusRule(editando.id, form);
      else await createBonusRule(form);
      toast.success(editando ? "Bono actualizado." : "Bono creado.");
      setAbierto(false);
      cargar();
    } catch (e: any) {
      // El mensaje viene de la validación del servidor y dice qué falta.
      toast.error(e?.message || "No se pudo guardar el bono.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!porBorrar) return;
    try {
      const res = await deleteBonusRule(porBorrar.id);
      toast.success(
        res.desactivado
          ? "El bono ya se otorgó en algún periodo, así que se apagó en vez de borrarse."
          : "Bono borrado."
      );
      setPorBorrar(null);
      cargar();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo borrar el bono.");
    }
  };

  const cambiarActivo = async (bono: Bono) => {
    // Optimista: el interruptor responde y se revierte si el servidor falla.
    setBonos((prev) => prev.map((b) => (b.id === bono.id ? { ...b, active: !b.active } : b)));
    try {
      await toggleBonusRule(bono.id, !bono.active);
    } catch (e: any) {
      setBonos((prev) => prev.map((b) => (b.id === bono.id ? { ...b, active: bono.active } : b)));
      toast.error(e?.message || "No se pudo cambiar el bono.");
    }
  };

  const esMeta = form.type === "SERVICES" || form.type === "REVENUE" || form.type === "CLIENTS";
  const meta = UNIDAD_META[form.type as string];

  const columnas: Column<Bono>[] = [
    {
      key: "bono",
      header: "Bono",
      primary: true,
      cell: (b) => (
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-brand-500">{ICONO[b.type]}</span>
          <div className="min-w-0">
            <div className={`font-medium ${b.active ? "text-gray-900 dark:text-white" : "text-gray-400 line-through"}`}>
              {b.name}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{comoSeGana(b)}</div>
            {b.description && <div className="mt-1 text-xs text-gray-400">{b.description}</div>}
          </div>
        </div>
      ),
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      className: "w-[120px]",
      cell: (b) => (
        <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{pesos(b.amount)}</span>
      ),
    },
    {
      key: "estado",
      header: "Activo",
      align: "center",
      className: "w-[110px]",
      cell: (b) => (
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 @3xl:min-h-0">
          <input
            type="checkbox"
            checked={b.active}
            onChange={() => cambiarActivo(b)}
            className="size-4 rounded text-brand-500 focus:ring-brand-500"
          />
          <span className="text-xs font-medium text-gray-500 @3xl:hidden">
            {b.active ? "Activo" : "Apagado"}
          </span>
        </label>
      ),
    },
    {
      key: "acciones",
      header: "",
      align: "right",
      className: "w-[110px]",
      hideOnCard: true,
      cell: (b) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => abrirEdicion(b)}
            aria-label={`Editar ${b.name}`}
            className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={() => setPorBorrar(b)}
            aria-label={`Borrar ${b.name}`}
            className="flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Bonos del salón"
      description="Los bonos que se pueden ganar en cada periodo de nómina. Cada salón tiene los suyos."
      actions={
        <Button onClick={abrirNuevo} className="h-11">
          <Plus className="mr-2 size-4" /> Nuevo bono
        </Button>
      }
    >
      <DataTable
        columns={columnas}
        rows={bonos}
        rowKey={(b) => b.id}
        loading={cargando && bonos.length === 0}
        empty="Todavía no hay bonos. Crea el primero con «Nuevo bono»."
        rowClassName={(b) => (b.active ? "" : "opacity-60")}
        cardFooter={(b) => (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => abrirEdicion(b)}>
              Editar
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setPorBorrar(b)}>
              Borrar
            </Button>
          </div>
        )}
      />

      {/* Alta y edición */}
      <Modal isOpen={abierto} onClose={() => setAbierto(false)} size="lg">
        <div className="w-full">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 pb-4 pr-16 pt-5 dark:border-gray-800 sm:px-6 sm:pb-5 sm:pr-20 sm:pt-6">
            <Label className="text-lg font-semibold sm:text-xl">
              {editando ? "Editar bono" : "Nuevo bono"}
            </Label>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            <div>
              <Label className="mb-1 block text-sm font-medium">Nombre</Label>
              <Input
                type="text"
                placeholder="Ej. Bono de puntualidad"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label className="mb-1 block text-sm font-medium">Cómo se gana</Label>
              <Select
                options={TIPOS}
                value={form.type as string}
                onChange={(v) => setForm({ ...form, type: v as DatosBono["type"] })}
              />
            </div>

            {/* Los campos cambian según el tipo: un bono de puntualidad no
                tiene meta, y uno manual no tiene nada que calcular. */}
            {form.type === "PUNCTUALITY" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block text-sm font-medium">Retardos tolerados</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.maxLates ?? 0}
                    onChange={(e) => setForm({ ...form, maxLates: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="mb-1 block text-sm font-medium">Faltas toleradas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.maxAbsences ?? 0}
                    onChange={(e) => setForm({ ...form, maxAbsences: Number(e.target.value) })}
                  />
                  <p className="mt-1 text-xs text-gray-400">Las justificadas no cuentan.</p>
                </div>
              </div>
            )}

            {esMeta && meta && (
              <div>
                <Label className="mb-1 block text-sm font-medium">{meta.etiqueta}</Label>
                <div className="relative">
                  {meta.prefijo && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">{meta.prefijo}</span>
                  )}
                  <Input
                    type="number"
                    min="0"
                    value={form.goal ?? ""}
                    onChange={(e) => setForm({ ...form, goal: Number(e.target.value) })}
                    className={meta.prefijo ? "pl-8" : ""}
                  />
                </div>
                {meta.sufijo && <p className="mt-1 text-xs text-gray-400">Se cuenta en {meta.sufijo}.</p>}
              </div>
            )}

            {form.type === "MANUAL" && (
              <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/5">
                Este bono no se calcula solo. Aparecerá en la nómina de cada periodo para otorgarlo
                o no a cada persona, con una nota.
              </p>
            )}

            <div>
              <Label className="mb-1 block text-sm font-medium">Monto</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  type="number"
                  min="0"
                  value={form.amount || ""}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label className="mb-1 block text-sm font-medium">Descripción (opcional)</Label>
              <TextArea
                rows={2}
                placeholder="Para qué es este bono, cómo explicárselo al equipo."
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear bono"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Confirmar borrado */}
      <Modal isOpen={!!porBorrar} onClose={() => setPorBorrar(null)} size="sm" className="p-6">
        <Label className="mb-2 block text-lg font-bold">¿Borrar «{porBorrar?.name}»?</Label>
        <p className="mb-6 text-sm text-gray-500">
          Si este bono ya se otorgó en algún periodo no se borra, se apaga: borrarlo cambiaría
          nóminas que ya pagaste.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setPorBorrar(null)}>
            Cancelar
          </Button>
          <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={borrar}>
            Borrar
          </Button>
        </div>
      </Modal>
    </PageShell>
  );
}

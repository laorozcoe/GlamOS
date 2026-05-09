"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { Pencil, Trash2, Tag, Copy, Plus, Package, CalendarDays, History, Loader2, Printer } from "lucide-react";
import Button from "@/components/ui/button/Button";
import {Modal} from "@/components/ui/modal";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Select from "@/components/form/Select";
import Badge from "@/components/ui/badge/Badge";
import { createCoupon, updateCoupon, deleteCoupon, getCouponSales, getCouponTokens, generateCouponTokens, getServicesForCoupons } from "./actions";
import { printCouponTokens } from "@/lib/printCouponTokens";
import { useBusiness } from "@/context/BusinessContext";

// ---- Types ----
type DiscountType = "PERCENTAGE" | "FIXED";
type LimitType = "QUANTITY" | "DATE" | "BOTH";
type CouponCategory = "DISCOUNT" | "COURTESY";

type ServiceItem = {
  id: string;
  name: string;
  price: number;
  category: { name: string };
};

interface Coupon {
  id: string;
  code: string;
  name: string;
  category: CouponCategory;
  type: DiscountType;
  value: number;
  minPurchase: number;
  serviceNote?: string | null;
  limitType: LimitType;
  totalStock: number;
  usedCount: number;
  startDate: string | Date;
  endDate: string | Date;
  active: boolean;
}

// ---- Helpers ----

const toInputDate = (date: any) =>
  date
    ? new Date(date).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" })
    : "";

const getQuantityInfo = (coupon: Coupon) => {
  const pct =
    coupon.totalStock > 0 ? (coupon.usedCount / coupon.totalStock) * 100 : 0;
  const remaining = coupon.totalStock - coupon.usedCount;
  const color =
    pct < 50 ? "bg-green-500" : pct < 75 ? "bg-amber-500" : "bg-red-500";
  return { pct, remaining, color };
};

const getDateInfo = (coupon: Coupon) => {
  const now = Date.now();
  const start = new Date(coupon.startDate).getTime();
  const end = new Date(coupon.endDate).getTime();
  const total = end - start;
  const elapsed = Math.max(0, now - start);
  const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
  const color =
    pct < 50 ? "bg-green-500" : pct < 75 ? "bg-amber-500" : "bg-red-500";
  return { pct, daysLeft, color };
};

const getCouponStatus = (coupon: Coupon) => {
  const now = new Date();
  const isExpired = new Date(coupon.endDate) < now;
  const isNotStarted = new Date(coupon.startDate) > now;
  const isExhausted =
    (coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH") &&
    coupon.usedCount >= coupon.totalStock;

  if (!coupon.active) return { label: "Inactivo", color: "error" as const };
  if (isNotStarted) return { label: "Pendiente", color: "warning" as const };
  if (isExpired || isExhausted) return { label: "Expirado", color: "error" as const };
  return { label: "Vigente", color: "success" as const };
};

// ---- Sales history modal ----

type SaleRow = {
  id: string;
  folio: number;
  total: number;
  discount: number;
  createdAt: string | Date;
  appointment: { guestName: string | null } | null;
  employee: { user: { name: string; lastName: string } };
};

function CouponUsageModal({
  couponId,
  couponCode,
  onClose,
}: {
  couponId: string;
  couponCode: string;
  onClose: () => void;
}) {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCouponSales(couponId)
      .then((rows) => setSales(rows as SaleRow[]))
      .catch(() => toast.error("Error al cargar historial"))
      .finally(() => setLoading(false));
  }, [couponId]);

  return (
    <Modal isOpen onClose={onClose} className="max-w-xl w-full m-4">
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
          Historial de cobros
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-mono">
          {couponCode}
        </p>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : sales.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            Este cupón aún no ha sido utilizado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 text-left font-medium">Folio</th>
                  <th className="pb-2 text-left font-medium">Fecha</th>
                  <th className="pb-2 text-left font-medium">Cliente</th>
                  <th className="pb-2 text-right font-medium">Descuento</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sales.map((s) => (
                  <tr key={s.id} className="text-gray-700 dark:text-gray-300">
                    <td className="py-2.5 font-mono text-xs text-gray-400">
                      #{s.folio}
                    </td>
                    <td className="py-2.5 text-xs">
                      {new Date(s.createdAt).toLocaleDateString("es-MX", {
                        timeZone: "America/Mexico_City",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 text-xs truncate max-w-[120px]">
                      {s.appointment?.guestName ||
                        `${s.employee.user.name} ${s.employee.user.lastName}`}
                    </td>
                    <td className="py-2.5 text-right text-xs text-green-600 dark:text-green-400 font-medium">
                      -${s.discount.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-bold">
                      ${s.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Service Picker Modal ----

function ServicePickerModal({
  selected,
  onConfirm,
  onClose,
}: {
  selected: ServiceItem[];
  onConfirm: (services: ServiceItem[]) => void;
  onClose: () => void;
}) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<ServiceItem[]>(selected);

  useEffect(() => {
    getServicesForCoupons()
      .then((data) => setServices(data as ServiceItem[]))
      .catch(() => toast.error("Error al cargar servicios"))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (svc: ServiceItem) => {
    setCurrent((prev) =>
      prev.some((s) => s.id === svc.id)
        ? prev.filter((s) => s.id !== svc.id)
        : [...prev, svc]
    );
  };

  const grouped = services.reduce<Record<string, ServiceItem[]>>((acc, svc) => {
    const cat = svc.category.name;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(svc);
    return acc;
  }, {});

  return (
    <Modal isOpen onClose={onClose} className="max-w-md w-full m-4">
      <div className="p-5 flex flex-col gap-4 max-h-[80vh]">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
          Seleccionar servicios
        </h3>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : (
          <div className="overflow-y-auto flex flex-col gap-4 flex-1">
            {Object.entries(grouped).map(([cat, svcs]) => (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  {cat}
                </p>
                <div className="flex flex-col gap-1">
                  {svcs.map((svc) => {
                    const checked = current.some((s) => s.id === svc.id);
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggle(svc)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                          checked
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                            : "border-gray-200 dark:border-gray-700 hover:border-purple-300 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span className="font-medium">{svc.name}</span>
                        <span className="text-xs tabular-nums font-semibold">
                          ${svc.price.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {current.length > 0 && (
          <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            {current.length} servicio{current.length !== 1 ? "s" : ""} seleccionado{current.length !== 1 ? "s" : ""}
            {" · "}Total: ${current.reduce((s, x) => s + x.price, 0).toFixed(2)}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onConfirm(current)} disabled={current.length === 0}>
            Confirmar ({current.length})
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Sub-components ----

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function CouponCard({
  coupon,
  onEdit,
  onDelete,
  onViewUsage,
  onPrint,
}: {
  coupon: Coupon;
  onEdit: (c: Coupon) => void;
  onDelete: (id: string) => void;
  onViewUsage: (c: Coupon) => void;
  onPrint: (c: Coupon) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [printing, setPrinting] = useState(false);
  const status = getCouponStatus(coupon);
  const showQty = coupon.limitType === "QUANTITY" || coupon.limitType === "BOTH";
  const showDate = coupon.limitType === "DATE" || coupon.limitType === "BOTH";
  const qtyInfo = showQty ? getQuantityInfo(coupon) : null;
  const dateInfo = showDate ? getDateInfo(coupon) : null;

  const copyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    toast.info(`Código "${coupon.code}" copiado`);
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 group w-fit"
            title="Copiar código"
          >
            <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-sm bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded tracking-wide">
              {coupon.code}
            </span>
            <Copy className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-500 transition-colors shrink-0" />
          </button>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
            {coupon.name}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => { onDelete(coupon.id); setConfirmDelete(false); }}
                className="text-red-600 hover:underline font-medium"
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-gray-500 hover:underline"
              >
                No
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={async () => { setPrinting(true); await onPrint(coupon); setPrinting(false); }}
                disabled={printing}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-40"
                title="Imprimir cupones"
              >
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onViewUsage(coupon)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-600 transition-colors"
                title="Ver cobros"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(coupon)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-brand-600 transition-colors"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info row */}
      <div className="flex flex-wrap items-center gap-2">
        {coupon.category === "COURTESY" ? (
          <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
            Cortesía 100%
          </span>
        ) : (
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {coupon.type === "PERCENTAGE"
              ? `${coupon.value}% off`
              : `$${coupon.value.toFixed(2)} off`}
          </span>
        )}
        {coupon.category !== "COURTESY" && coupon.minPurchase > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            · Mín. ${coupon.minPurchase}
          </span>
        )}
        <Badge variant="light" color={coupon.category === "COURTESY" ? "info" : status.color} size="sm">
          {coupon.category === "COURTESY" ? "Cortesía" : status.label}
        </Badge>
        <Badge variant="light" color={status.color} size="sm">
          {status.label}
        </Badge>
      </div>
      {coupon.category === "COURTESY" && coupon.serviceNote && (() => {
        let names: string[] = [];
        try { names = (JSON.parse(coupon.serviceNote!) as ServiceItem[]).map((s) => s.name); }
        catch { names = [coupon.serviceNote!]; }
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((n) => (
              <span key={n} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                {n}
              </span>
            ))}
          </div>
        );
      })()}

      {/* Progress bars */}
      <div className="flex flex-col gap-2.5">
        {showQty && qtyInfo && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" /> Usos
              </span>
              <span className="font-medium tabular-nums">
                {coupon.usedCount} / {coupon.totalStock}
                <span className="text-gray-400 ml-1">
                  ({qtyInfo.remaining} restantes)
                </span>
              </span>
            </div>
            <ProgressBar pct={qtyInfo.pct} color={qtyInfo.color} />
          </div>
        )}

        {showDate && dateInfo && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Vigencia
              </span>
              <span className="font-medium tabular-nums">
                {dateInfo.daysLeft > 0
                  ? `${dateInfo.daysLeft} días restantes`
                  : "Expirado"}
              </span>
            </div>
            <ProgressBar pct={dateInfo.pct} color={dateInfo.color} />
          </div>
        )}
      </div>

      {/* Date range */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-auto">
        {new Date(coupon.startDate).toLocaleDateString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
        {" — "}
        {new Date(coupon.endDate).toLocaleDateString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

// ---- Form defaults ----
const emptyForm = {
  code: "",
  name: "",
  category: "DISCOUNT",
  type: "PERCENTAGE",
  value: "",
  minPurchase: "0",
  serviceNote: "",
  limitType: "QUANTITY",
  totalStock: "100",
  startDate: "",
  endDate: "",
};

type FormState = typeof emptyForm;

// ---- Main component ----
export default function CouponsClient({ coupons: initial }: { coupons: Coupon[] }) {
  const business = useBusiness();
  const [coupons, setCoupons] = useState<Coupon[]>(initial);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [usageTarget, setUsageTarget] = useState<Coupon | null>(null);
  const [printTarget, setPrintTarget] = useState<Coupon | null>(null);
  const [genCount, setGenCount] = useState("10");
  const [generating, setGenerating] = useState(false);
  const [selectedServices, setSelectedServices] = useState<ServiceItem[]>([]);
  const [showServicePicker, setShowServicePicker] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSelectedServices([]);
    setIsModalOpen(true);
  };

  const openEdit = (coupon: Coupon) => {
    setEditing(coupon);
    // Intentar recuperar servicios del JSON guardado en serviceNote
    let parsedServices: ServiceItem[] = [];
    try {
      if (coupon.serviceNote) parsedServices = JSON.parse(coupon.serviceNote);
    } catch { /* serviceNote es texto plano, no JSON */ }
    setSelectedServices(parsedServices);
    setForm({
      code: coupon.code,
      name: coupon.name,
      category: coupon.category ?? "DISCOUNT",
      type: coupon.type,
      value: String(coupon.value),
      minPurchase: String(coupon.minPurchase),
      serviceNote: coupon.serviceNote ?? "",
      limitType: coupon.limitType,
      totalStock: String(coupon.totalStock),
      startDate: toInputDate(coupon.startDate),
      endDate: toInputDate(coupon.endDate),
    });
    setIsModalOpen(true);
  };

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    const isCourtesy = form.category === "COURTESY";
    const needsDates = form.limitType === "DATE" || form.limitType === "BOTH";
    if (!form.code || !form.name || (!isCourtesy && !form.value)) {
      toast.warning("Completa todos los campos requeridos");
      return;
    }
    if (isCourtesy && selectedServices.length === 0) {
      toast.warning("Selecciona al menos un servicio para la cortesía");
      return;
    }
    if (needsDates && (!form.startDate || !form.endDate)) {
      toast.warning("Completa las fechas de vigencia");
      return;
    }
    if (!isCourtesy && form.type === "PERCENTAGE" && Number(form.value) > 100) {
      toast.warning("El porcentaje no puede ser mayor a 100");
      return;
    }
    if (needsDates && form.startDate && form.endDate &&
        new Date(form.endDate) < new Date(form.startDate)) {
      toast.warning("La fecha de fin debe ser posterior a la de inicio");
      return;
    }
    if (
      (form.limitType === "QUANTITY" || form.limitType === "BOTH") &&
      Number(form.totalStock) < 1
    ) {
      toast.warning("El total de usos debe ser al menos 1");
      return;
    }

    const formToSave = {
      ...form,
      serviceNote: isCourtesy && selectedServices.length > 0
        ? JSON.stringify(selectedServices)
        : form.serviceNote,
    };

    setSaving(true);
    try {
      if (editing) {
        const updated = await updateCoupon(editing.id, formToSave);
        setCoupons((prev) =>
          prev.map((c) => (c.id === editing.id ? ({ ...c, ...updated } as Coupon) : c))
        );
        toast.success("Cupón actualizado");
      } else {
        const created = await createCoupon(formToSave);
        setCoupons((prev) => [created as Coupon, ...prev]);
        toast.success("Cupón creado");
      }
      setIsModalOpen(false);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("Unique constraint")) {
        toast.error("Ya existe un cupón con ese código");
      } else {
        toast.error("Error al guardar el cupón");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoupon(id);
      setCoupons((prev) => prev.filter((c) => c.id !== id));
      toast.success("Cupón eliminado");
    } catch {
      toast.error("Error al eliminar el cupón");
    }
  };

  const handlePrint = async (coupon: Coupon) => {
    try {
      const tokens = await getCouponTokens(coupon.id);
      const unused = (tokens as any[]).filter((t) => !t.usedAt);

      if (unused.length === 0) {
        if (coupon.limitType === "DATE") {
          // Por fecha: no hay límite definido de copias → preguntar cuántas
          setPrintTarget(coupon);
          return;
        }
        // Por cantidad o combinado: generar exactamente totalStock tokens
        await generateCouponTokens(coupon.id, coupon.totalStock);
        const fresh = await getCouponTokens(coupon.id);
        await printCouponTokens(business?.name ?? "Mi Negocio", business?.slug ?? "", coupon, fresh as any);
        return;
      }

      await printCouponTokens(business?.name ?? "Mi Negocio", business?.slug ?? "", coupon, tokens as any);
    } catch {
      toast.error("Error al generar la hoja de impresión");
    }
  };

  const handleGenerateAndPrint = async () => {
    if (!printTarget) return;
    const count = parseInt(genCount);
    if (isNaN(count) || count < 1 || count > 500) {
      toast.warning("Ingresa una cantidad entre 1 y 500");
      return;
    }
    setGenerating(true);
    try {
      await generateCouponTokens(printTarget.id, count);
      const tokens = await getCouponTokens(printTarget.id);
      await printCouponTokens(business?.name ?? "Mi Negocio", business?.slug ?? "", printTarget, tokens as any);
      setPrintTarget(null);
      setGenCount("10");
    } catch {
      toast.error("Error al generar los tokens");
    } finally {
      setGenerating(false);
    }
  };

  const isCourtesy = form.category === "COURTESY";
  const showStock = form.limitType === "QUANTITY" || form.limitType === "BOTH";
  const showDates = form.limitType === "DATE" || form.limitType === "BOTH";

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">
            Cupones de descuento
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {coupons.length} cupón{coupons.length !== 1 ? "es" : ""} registrado
            {coupons.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate} startIcon={<Plus className="w-4 h-4" />}>
          Nuevo cupón
        </Button>
      </div>

      {/* Empty state */}
      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500 gap-3">
          <Tag className="w-12 h-12 opacity-30" />
          <p className="text-sm">Aún no hay cupones. Crea el primero.</p>
          <Button onClick={openCreate} size="sm" variant="outline">
            Crear cupón
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              onEdit={openEdit}
              onDelete={handleDelete}
              onViewUsage={setUsageTarget}
              onPrint={handlePrint}
            />
          ))}
        </div>
      )}

      {/* Usage history modal */}
      {usageTarget && (
        <CouponUsageModal
          couponId={usageTarget.id}
          couponCode={usageTarget.code}
          onClose={() => setUsageTarget(null)}
        />
      )}

      {/* Generate tokens + print modal */}
      {printTarget && (
        <Modal isOpen onClose={() => setPrintTarget(null)} className="max-w-sm w-full m-4">
          <div className="p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">
              Generar cupones físicos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 font-mono">
              {printTarget.name} · {printTarget.code}
            </p>
            <Label htmlFor="gen-count">¿Cuántos cupones quieres imprimir?</Label>
            <InputField
              id="gen-count"
              type="number"
              min="1"
              max="500"
              value={genCount}
              onChange={(e) => setGenCount(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-2">
              Este cupón es por fecha y no tiene un límite de copias definido.
              Cada cupón impreso tendrá un QR único válido una sola vez. Máximo 500 por lote.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <Button variant="outline" onClick={() => setPrintTarget(null)} disabled={generating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateAndPrint} disabled={generating}>
                {generating ? "Generando..." : "Generar e Imprimir"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-lg w-full m-4"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-5">
            {editing ? "Editar cupón" : "Nuevo cupón"}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Category toggle */}
            <div className="col-span-2">
              <Label>Tipo de cupón</Label>
              <div className="flex gap-2 mt-1">
                {(["DISCOUNT", "COURTESY"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => set("category")(cat)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      form.category === cat
                        ? cat === "COURTESY"
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-brand-600 text-white border-brand-600"
                        : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-brand-400"
                    }`}
                  >
                    {cat === "DISCOUNT" ? "Descuento" : "Cortesía"}
                  </button>
                ))}
              </div>
            </div>

            {/* Code */}
            <div>
              <Label htmlFor="coupon-code">Código *</Label>
              <InputField
                id="coupon-code"
                placeholder="VERANO25"
                value={form.code}
                onChange={(e) => set("code")(e.target.value.toUpperCase())}
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="coupon-name">Nombre *</Label>
              <InputField
                id="coupon-name"
                placeholder={isCourtesy ? "Corte + Tinte gratis" : "Promo Verano"}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
              />
            </div>

            {/* DISCOUNT: tipo y valor */}
            {!isCourtesy && (
              <>
                <div>
                  <Label>Tipo de descuento</Label>
                  <Select
                    options={[
                      { value: "PERCENTAGE", label: "Porcentaje (%)" },
                      { value: "FIXED", label: "Monto fijo ($)" },
                    ]}
                    value={form.type}
                    onChange={set("type")}
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-value">
                    Valor {form.type === "PERCENTAGE" ? "(%)" : "($)"} *
                  </Label>
                  <InputField
                    id="coupon-value"
                    type="number"
                    min="0"
                    max={form.type === "PERCENTAGE" ? "100" : undefined}
                    step={0.01}
                    placeholder={form.type === "PERCENTAGE" ? "15" : "150.00"}
                    value={form.value}
                    onChange={(e) => set("value")(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="coupon-min">Compra mínima ($)</Label>
                  <InputField
                    id="coupon-min"
                    type="number"
                    min="0"
                    step={0.01}
                    placeholder="0"
                    value={form.minPurchase}
                    onChange={(e) => set("minPurchase")(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* COURTESY: selector de servicios */}
            {isCourtesy && (
              <>
                <div className="col-span-2">
                  <Label>Servicios incluidos *</Label>
                  <button
                    type="button"
                    onClick={() => setShowServicePicker(true)}
                    className="mt-1 w-full border border-dashed border-purple-400 rounded-lg px-3 py-2.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                  >
                    {selectedServices.length === 0
                      ? "Toca para seleccionar servicios..."
                      : `${selectedServices.length} servicio${selectedServices.length !== 1 ? "s" : ""} seleccionado${selectedServices.length !== 1 ? "s" : ""}`}
                  </button>
                  {selectedServices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedServices.map((svc) => (
                        <span
                          key={svc.id}
                          className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full"
                        >
                          {svc.name}
                          <span className="font-semibold">${svc.price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedServices((p) => p.filter((s) => s.id !== svc.id))}
                            className="ml-0.5 hover:text-purple-900"
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Compra mínima opcional para cortesía */}
                <div className="col-span-2">
                  <Label htmlFor="coupon-min-courtesy">Compra mínima ($) <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <InputField
                    id="coupon-min-courtesy"
                    type="number"
                    min="0"
                    step={0.01}
                    placeholder="0"
                    value={form.minPurchase}
                    onChange={(e) => set("minPurchase")(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Limit type */}
            <div>
              <Label>Límite por</Label>
              <Select
                options={[
                  { value: "QUANTITY", label: "Número de usos" },
                  { value: "DATE", label: "Fecha" },
                  { value: "BOTH", label: "Usos y fecha" },
                ]}
                value={form.limitType}
                onChange={set("limitType")}
              />
            </div>

            {/* Total stock — visible only when QUANTITY or BOTH */}
            {showStock && (
              <div className="col-span-2">
                <Label htmlFor="coupon-stock">Total de usos disponibles</Label>
                <InputField
                  id="coupon-stock"
                  type="number"
                  min="1"
                  placeholder="100"
                  value={form.totalStock}
                  onChange={(e) => set("totalStock")(e.target.value)}
                />
              </div>
            )}

            {showDates && (
              <>
                <div>
                  <Label htmlFor="coupon-start">Fecha inicio *</Label>
                  <InputField
                    id="coupon-start"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => set("startDate")(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="coupon-end">Fecha fin *</Label>
                  <InputField
                    id="coupon-end"
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set("endDate")(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editing ? "Actualizar" : "Crear cupón"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Service picker — renderizado DESPUÉS del form modal para ganar en z-index */}
      {showServicePicker && (
        <ServicePickerModal
          selected={selectedServices}
          onConfirm={(svcs) => { setSelectedServices(svcs); setShowServicePicker(false); }}
          onClose={() => setShowServicePicker(false)}
        />
      )}
    </>
  );
}

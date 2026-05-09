"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import {
  Plus, Pencil, Trash2, Sparkles, Tag, ShoppingBag, Layers,
  CalendarDays, CheckCircle, XCircle, ChevronDown, ChevronUp, Check, X,
} from "lucide-react";
import { useBusiness } from "@/context/BusinessContext";
import { getServicesPrisma } from "@/lib/prisma";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  PromotionRow,
} from "./actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Service {
  id: string;
  name: string;
  categoryId: string;
  price: number;
  active: boolean;
}

const TYPES = [
  {
    value: "SERVICE_DISCOUNT",
    label: "Descuento en servicio",
    icon: <Tag className="w-4 h-4" />,
    description: "Descuento % o fijo en uno o más servicios",
  },
  {
    value: "BUY_X_GET_Y",
    label: "2×1 / N×M",
    icon: <ShoppingBag className="w-4 h-4" />,
    description: "Por cada N del MISMO servicio, M son gratis (citas repetidas o simultáneas)",
  },
  {
    value: "COMBO",
    label: "Combo",
    icon: <Layers className="w-4 h-4" />,
    description: "Descuento cuando un conjunto específico de servicios aparece junto en el cobro",
  },
] as const;

type PromoType = "SERVICE_DISCOUNT" | "BUY_X_GET_Y" | "COMBO";

interface FormState {
  name: string;
  type: PromoType;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  buyQuantity: string;
  getQuantity: string;
  startDate: string;
  endDate: string;
  active: boolean;
  services: string[]; // service IDs only
}

const emptyForm = (): FormState => ({
  name: "",
  type: "SERVICE_DISCOUNT",
  discountType: "PERCENTAGE",
  discountValue: "",
  buyQuantity: "2",
  getQuantity: "1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  active: true,
  services: [],
});

function toISODate(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

function typeIcon(type: string) {
  if (type === "BUY_X_GET_Y") return <ShoppingBag className="w-4 h-4" />;
  if (type === "COMBO") return <Layers className="w-4 h-4" />;
  return <Tag className="w-4 h-4" />;
}

function typeLabel(type: string) {
  if (type === "BUY_X_GET_Y") return "2×1 / N×M";
  if (type === "COMBO") return "Combo";
  return "Descuento";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PromotionsClient({ initialPromotions }: { initialPromotions: PromotionRow[] }) {
  const business = useBusiness();
  const [promotions, setPromotions] = useState<PromotionRow[]>(initialPromotions);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<PromotionRow | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!business?.id) return;
    getServicesPrisma(business.id).then((s: Service[]) => setServices(s.filter((x) => x.active)));
  }, [business?.id]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setIsFormOpen(true);
  };

  const openEdit = (p: PromotionRow) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type as PromoType,
      discountType: (p.discountType as "PERCENTAGE" | "FIXED") || "PERCENTAGE",
      discountValue: p.discountValue?.toString() ?? "",
      buyQuantity: p.buyQuantity?.toString() ?? "2",
      getQuantity: p.getQuantity?.toString() ?? "1",
      startDate: toISODate(p.startDate),
      endDate: toISODate(p.endDate),
      active: p.active,
      services: p.services.map((s) => s.serviceId),
    });
    setError(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setIsPickerOpen(false);
    setEditingId(null);
    setError(null);
  };

  const setF = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const removeService = (id: string) =>
    setF("services", form.services.filter((s) => s !== id));

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    if (!form.services.length) { setError("Selecciona al menos un servicio"); return; }
    if (form.type !== "BUY_X_GET_Y" && !form.discountValue) {
      setError("El valor del descuento es requerido"); return;
    }
    if (form.type === "COMBO" && form.services.length < 2) {
      setError("Un combo requiere al menos 2 servicios"); return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        discountType: form.type !== "BUY_X_GET_Y" ? form.discountType : null,
        discountValue: form.type !== "BUY_X_GET_Y" ? parseFloat(form.discountValue) : null,
        buyQuantity: form.type === "BUY_X_GET_Y" ? parseInt(form.buyQuantity) : 2,
        getQuantity: form.type === "BUY_X_GET_Y" ? parseInt(form.getQuantity) : 1,
        startDate: form.startDate,
        endDate: form.endDate,
        services: form.services.map((id) => ({ serviceId: id, role: "PRIMARY" })),
      };

      if (editingId) {
        await updatePromotion({ ...payload, id: editingId, active: form.active });
      } else {
        await createPromotion(payload);
      }

      const { getPromotions } = await import("./actions");
      const fresh = await getPromotions();
      setPromotions(fresh);
      closeForm();
    } catch (e: any) {
      setError(e.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deletePromotion(deleteTarget.id);
      setPromotions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const now = Date.now();
  const active = promotions.filter((p) => p.active && new Date(p.endDate).getTime() >= now);
  const inactive = promotions.filter((p) => !p.active || new Date(p.endDate).getTime() < now);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Promociones</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Se aplican automáticamente en el cobro según los servicios en el carrito
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nueva promoción
        </Button>
      </div>

      {/* ── Active Promotions ── */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Activas ({active.length})
          </h2>
          {active.map((p) => (
            <PromotionCard
              key={p.id}
              promo={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteTarget(p)}
            />
          ))}
        </section>
      )}

      {/* ── Inactive ── */}
      {inactive.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Vencidas / Inactivas ({inactive.length})
          </h2>
          {inactive.map((p) => (
            <PromotionCard
              key={p.id}
              promo={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onEdit={() => openEdit(p)}
              onDelete={() => setDeleteTarget(p)}
              faded
            />
          ))}
        </section>
      )}

      {promotions.length === 0 && (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500">
          <Sparkles className="w-10 h-10 opacity-30" />
          <p className="text-sm">No hay promociones aún</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            Crear primera promoción
          </Button>
        </div>
      )}

      {/* ── Form Modal ── */}
      <Modal isOpen={isFormOpen} onClose={closeForm} className="max-w-2xl w-full m-4">
        <div className="flex flex-col max-h-[calc(100dvh-2rem)]">
          {/* Header */}
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingId ? "Editar promoción" : "Nueva promoción"}
            </h2>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nombre
              </label>
              <input
                value={form.name}
                onChange={(e) => setF("name", e.target.value)}
                placeholder="Ej: 2×1 en manicura los lunes"
                className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {/* Type picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tipo de promoción
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setF("type", t.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${
                      form.type === t.value
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${form.type === t.value ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {t.icon}
                      {t.label}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount config */}
            {form.type === "BUY_X_GET_Y" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Compra N veces
                    </label>
                    <input
                      type="number"
                      min="2"
                      value={form.buyQuantity}
                      onChange={(e) => setF("buyQuantity", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Lleva M gratis
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.getQuantity}
                      onChange={(e) => setF("getQuantity", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-xl">
                  Por cada {form.buyQuantity} veces el MISMO servicio (en la misma cita o al pagar citas simultáneas),
                  el (los) {form.getQuantity} de menor precio son gratis.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Tipo de descuento
                  </label>
                  <div className="flex gap-2">
                    {(["PERCENTAGE", "FIXED"] as const).map((dt) => (
                      <button
                        key={dt}
                        onClick={() => setF("discountType", dt)}
                        className={`flex-1 py-2 text-sm rounded-xl border-2 font-semibold transition-all ${
                          form.discountType === dt
                            ? "border-brand-500 bg-brand-500 text-white"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {dt === "PERCENTAGE" ? "%" : "$"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Valor
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">
                      {form.discountType === "PERCENTAGE" ? "%" : "$"}
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={form.discountValue}
                      onChange={(e) => setF("discountValue", e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                </div>
                {form.type === "COMBO" && (
                  <p className="col-span-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-xl">
                    El descuento se aplica sobre la suma de los servicios del combo cuando todos aparecen juntos en el cobro.
                  </p>
                )}
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Fecha inicio
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setF("startDate", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Fecha fin
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setF("endDate", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            </div>

            {/* Services */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Servicios incluidos
                </label>
                <button
                  onClick={() => setIsPickerOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors px-2.5 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {form.services.length > 0 ? "Editar selección" : "Seleccionar servicios"}
                </button>
              </div>

              {form.services.length === 0 ? (
                <button
                  onClick={() => setIsPickerOpen(true)}
                  className="w-full py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-500 transition-all"
                >
                  Toca para seleccionar servicios
                </button>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 min-h-[48px]">
                  {form.services.map((id) => {
                    const svc = services.find((x) => x.id === id);
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
                      >
                        {svc?.name ?? id}
                        <button
                          onClick={() => removeService(id)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {form.type === "BUY_X_GET_Y" && form.services.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  La regla {form.buyQuantity}×{form.getQuantity} se evalúa de forma independiente para cada servicio de la lista.
                </p>
              )}
              {form.type === "COMBO" && form.services.length >= 2 && (
                <p className="mt-1.5 text-xs text-purple-600 dark:text-purple-400">
                  Se requieren <strong>todos</strong> estos {form.services.length} servicios juntos para activar el descuento.
                </p>
              )}
            </div>

            {/* Active toggle (edit only) */}
            {editingId && (
              <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activa</span>
                <button
                  onClick={() => setF("active", !form.active)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${form.active ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-200 dark:border-gray-700 shrink-0 flex gap-3 justify-end">
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear promoción"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Service Picker Modal ── */}
      <ServicePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        services={services}
        selected={form.services}
        onConfirm={(ids) => setF("services", ids)}
      />

      {/* ── Delete Confirm ── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} className="max-w-sm w-full m-4">
        <div className="p-5 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">¿Desactivar promoción?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{deleteTarget?.name}</span> dejará de aplicarse en nuevos cobros.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "..." : "Desactivar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── ServicePickerModal ───────────────────────────────────────────────────────

function ServicePickerModal({
  isOpen,
  onClose,
  services,
  selected,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  selected: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const [local, setLocal] = useState<string[]>(selected);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLocal(selected);
      setSearch("");
    }
  }, [isOpen]);

  const filtered = services.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) =>
    setLocal((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full m-4">
      <div className="flex flex-col max-h-[calc(100dvh-4rem)]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white">Seleccionar servicios</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {local.length === 0 ? "Ninguno seleccionado" : `${local.length} seleccionado(s)`}
          </p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {filtered.map((svc) => {
            const isSelected = local.includes(svc.id);
            return (
              <button
                key={svc.id}
                onClick={() => toggle(svc.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isSelected
                    ? "border-brand-400 bg-brand-50 dark:bg-brand-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                  isSelected ? "border-brand-500 bg-brand-500" : "border-gray-300 dark:border-gray-600"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? "text-brand-700 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {svc.name}
                  </p>
                  <p className="text-xs text-gray-400">${svc.price.toLocaleString()}</p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-400">Sin resultados</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={() => { onConfirm(local); onClose(); }}
          >
            Confirmar{local.length > 0 ? ` (${local.length})` : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── PromotionCard ────────────────────────────────────────────────────────────

function PromotionCard({
  promo,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  faded = false,
}: {
  promo: PromotionRow;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  faded?: boolean;
}) {
  const now = Date.now();
  const daysLeft = Math.ceil((new Date(promo.endDate).getTime() - now) / 86400000);
  const isExpired = daysLeft < 0;

  const discountLabel =
    promo.type === "BUY_X_GET_Y"
      ? `${promo.buyQuantity}×${promo.getQuantity}`
      : promo.discountType === "PERCENTAGE"
      ? `${promo.discountValue}% off`
      : `$${promo.discountValue} off`;

  return (
    <div className={`rounded-2xl border transition-all ${faded ? "border-gray-100 dark:border-gray-800 opacity-60" : "border-gray-200 dark:border-gray-700"}`}>
      <div
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
      >
        <div className={`p-2 rounded-xl ${faded ? "bg-gray-100 dark:bg-gray-800 text-gray-400" : "bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400"}`}>
          {typeIcon(promo.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white text-sm">{promo.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
              {typeLabel(promo.type)}
            </span>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{discountLabel}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {isExpired ? "Vencida" : `${daysLeft}d restantes`}
            </span>
            <span>{promo.services.length} servicio(s)</span>
            {promo.active && !isExpired ? (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" /> Activa
              </span>
            ) : (
              <span className="flex items-center gap-1 text-gray-400">
                <XCircle className="w-3 h-3" /> Inactiva
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3">
          <div className="flex flex-wrap gap-2">
            {promo.services.map((s) => (
              <span
                key={s.serviceId}
                className="text-xs px-2.5 py-1 rounded-full font-medium bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
              >
                {s.serviceName}
              </span>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
            {new Date(promo.startDate).toLocaleDateString("es-MX")} → {new Date(promo.endDate).toLocaleDateString("es-MX")}
          </div>
        </div>
      )}
    </div>
  );
}

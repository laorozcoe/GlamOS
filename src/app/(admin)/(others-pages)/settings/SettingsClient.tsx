"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getBusinessSettings, updateBusinessSettings, savePaymentTerminals, updateThemeColors, listMpDevices, changeMpDeviceMode } from "./actions";
import { Save, Plus, Trash2, CheckCircle2, ShieldCheck, Store, Clock, Palette, RefreshCw, Wifi, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";

// ── Color palette ─────────────────────────────────────────────────────────────
const COLOR_KEYS = [
  "--color-brand-25",  "--color-brand-50",  "--color-brand-100",
  "--color-brand-200", "--color-brand-300", "--color-brand-400",
  "--color-brand-500", "--color-brand-600", "--color-brand-700",
  "--color-brand-800", "--color-brand-900", "--color-brand-950",
] as const;

const COLOR_LABELS: Record<string, string> = {
  "--color-brand-25":  "25 — Fondo sutil",
  "--color-brand-50":  "50 — Fondo claro",
  "--color-brand-100": "100 — Borde suave",
  "--color-brand-200": "200 — Borde",
  "--color-brand-300": "300 — Acento claro",
  "--color-brand-400": "400 — Acento",
  "--color-brand-500": "500 — Principal ★",
  "--color-brand-600": "600 — Hover",
  "--color-brand-700": "700 — Activo",
  "--color-brand-800": "800 — Oscuro",
  "--color-brand-900": "900 — Más oscuro",
  "--color-brand-950": "950 — Texto oscuro",
};

type ThemeColors = Record<string, string>;

const PRESETS: Record<string, ThemeColors> = {
  Rosa: {
    "--color-brand-25":  "#fff5f7", "--color-brand-50":  "#fff0f3",
    "--color-brand-100": "#ffe4ec", "--color-brand-200": "#fecdd9",
    "--color-brand-300": "#fda4c0", "--color-brand-400": "#fb7aa4",
    "--color-brand-500": "#f72c5b", "--color-brand-600": "#e31b4b",
    "--color-brand-700": "#be123c", "--color-brand-800": "#9f1239",
    "--color-brand-900": "#881337", "--color-brand-950": "#4c0519",
  },
  Verde: {
    "--color-brand-25":  "#f7faf9", "--color-brand-50":  "#f0f7f2",
    "--color-brand-100": "#e3f4e9", "--color-brand-200": "#c8e6c5",
    "--color-brand-300": "#a5d6a7", "--color-brand-400": "#81c784",
    "--color-brand-500": "#66bb6a", "--color-brand-600": "#4caf50",
    "--color-brand-700": "#43a047", "--color-brand-800": "#388e3c",
    "--color-brand-900": "#2e7d32", "--color-brand-950": "#1b5e20",
  },
  Morado: {
    "--color-brand-25":  "#faf5ff", "--color-brand-50":  "#f5f3ff",
    "--color-brand-100": "#ede9fe", "--color-brand-200": "#ddd6fe",
    "--color-brand-300": "#c4b5fd", "--color-brand-400": "#a78bfa",
    "--color-brand-500": "#8b5cf6", "--color-brand-600": "#7c3aed",
    "--color-brand-700": "#6d28d9", "--color-brand-800": "#5b21b6",
    "--color-brand-900": "#4c1d95", "--color-brand-950": "#2e1065",
  },
  Azul: {
    "--color-brand-25":  "#f0f9ff", "--color-brand-50":  "#e0f2fe",
    "--color-brand-100": "#bae6fd", "--color-brand-200": "#7dd3fc",
    "--color-brand-300": "#38bdf8", "--color-brand-400": "#0ea5e9",
    "--color-brand-500": "#0284c7", "--color-brand-600": "#0369a1",
    "--color-brand-700": "#075985", "--color-brand-800": "#0c4a6e",
    "--color-brand-900": "#0a3451", "--color-brand-950": "#082032",
  },
  Naranja: {
    "--color-brand-25":  "#fff8f0", "--color-brand-50":  "#fff4e6",
    "--color-brand-100": "#ffe8cc", "--color-brand-200": "#ffd199",
    "--color-brand-300": "#ffba66", "--color-brand-400": "#ffa333",
    "--color-brand-500": "#f97316", "--color-brand-600": "#ea6c0a",
    "--color-brand-700": "#c2560a", "--color-brand-800": "#9a4209",
    "--color-brand-900": "#7c3409", "--color-brand-950": "#431a04",
  },
};
// ── End color palette ──────────────────────────────────────────────────────────

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [savingBase, setSavingBase] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);
  const [savingColors, setSavingColors] = useState(false);

  // Base Data Form
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    mpAccessToken: "",
    mpStoreId: "",
    mpWebhookSecret: "",
    openHour: 9,
    closeHour: 18,
    weekStartDay: 1
  });
  const [businessId, setBusinessId] = useState("");

  // Terminals
  const [terminals, setTerminals] = useState<any[]>([]);

  // Theme colors
  const [themeColors, setThemeColors] = useState<ThemeColors>(PRESETS.Rosa);

  useEffect(() => { loadData(); }, []);

  // Apply colors to DOM in real-time for live preview
  useEffect(() => {
    COLOR_KEYS.forEach((key) => {
      const val = themeColors[key];
      if (val) document.documentElement.style.setProperty(key, val);
    });
  }, [themeColors]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getBusinessSettings();
      if (data) {
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          mpAccessToken: data.mpAccessToken || "",
          mpStoreId: data.mpStoreId || "",
          mpWebhookSecret: data.mpWebhookSecret || "",
          openHour: data.openHour ?? 9,
          closeHour: data.closeHour ?? 18,
          weekStartDay: data.weekStartDay ?? 1
        });
        setBusinessId(data.id || "");
        setTerminals(data.terminals || []);
        if (data.themeColors && typeof data.themeColors === "object" && !Array.isArray(data.themeColors)) {
          setThemeColors(data.themeColors as ThemeColors);
        }
        // Detectar en segundo plano el modo (PDV/STANDALONE) de cada terminal
        if (data.mpAccessToken) {
          listMpDevices()
            .then((r) => { if (!r.error) setMpDevices(r.devices || []); })
            .catch(() => {});
        }
      }
    } catch (e) {
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  const handleColorChange = (key: string, value: string) => {
    setThemeColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveColors = async () => {
    setSavingColors(true);
    try {
      await updateThemeColors(themeColors);
      toast.success("Colores guardados correctamente");
    } catch (e) {
      toast.error("Error al guardar colores");
    } finally {
      setSavingColors(false);
    }
  };

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSaveBase = async () => {
    setSavingBase(true);
    try {
      await updateBusinessSettings(formData);
      toast.success("Configuración general guardada");
    } catch (e) {
      toast.error("Error guardando datos base");
    } finally {
      setSavingBase(false);
    }
  };

  // ── Terminales detectadas en MercadoPago ──
  const [mpDevices, setMpDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [changingMode, setChangingMode] = useState<string | null>(null);

  const handleDetectDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await listMpDevices();
      if (res.error) {
        toast.error(res.error);
        setMpDevices([]);
      } else {
        setMpDevices(res.devices || []);
        if ((res.devices || []).length === 0) {
          toast.info("No se encontraron terminales en esta cuenta de MercadoPago.");
        }
      }
    } catch {
      toast.error("Error al consultar las terminales de MercadoPago");
    } finally {
      setLoadingDevices(false);
    }
  };

  // Agrega una terminal detectada a la lista local (si no existe ya por posId)
  const importDevice = (device: any) => {
    if (terminals.some((t) => t.posId === device.id)) {
      toast.info("Esa terminal ya está en tu lista.");
      return;
    }
    const friendly = device.id.split("__")[0]?.replace(/_/g, " ") || "Terminal";
    setTerminals([
      ...terminals,
      { id: null, name: friendly, posId: device.id, isDefault: terminals.length === 0 },
    ]);
    toast.success("Terminal agregada. No olvides Guardar Terminales.");
  };

  // Modo actual (PDV/STANDALONE) de una terminal guardada, según lo detectado en MP.
  const modeForPos = (posId: string): string | null =>
    mpDevices.find((d) => d.id === posId)?.operating_mode ?? null;

  // Alterna el modo de una terminal guardada (pide confirmación al volver a Standalone).
  const toggleSavedTerminalMode = (posId: string) => {
    const mode = modeForPos(posId);
    if (mode === "PDV") {
      if (!window.confirm(
        "¿Volver esta terminal a modo STANDALONE?\n\nDejará de recibir cobros desde el sistema: los cobros con tarjeta dejarán de funcionar en la app hasta reactivar PDV. Tendrás que reiniciar la terminal para que el cambio tome efecto."
      )) return;
      handleChangeMode({ id: posId }, "STANDALONE");
    } else {
      handleChangeMode({ id: posId }, "PDV");
    }
  };

  const handleChangeMode = async (device: any, mode: "PDV" | "STANDALONE") => {
    setChangingMode(device.id);
    try {
      const res = await changeMpDeviceMode(device.id, mode);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Modo cambiado a ${mode}. Reinicia la terminal para aplicar el cambio.`);
        setMpDevices((prev) =>
          prev.map((d) => (d.id === device.id ? { ...d, operating_mode: mode } : d))
        );
      }
    } catch {
      toast.error("Error al cambiar el modo de la terminal");
    } finally {
      setChangingMode(null);
    }
  };

  const addTerminal = () => {
    setTerminals([...terminals, { id: null, name: "", posId: "", isDefault: terminals.length === 0 }]);
  };

  const updateTerminal = (index: number, field: string, value: any) => {
    const newTerminals = [...terminals];
    if (field === "isDefault" && value === true) {
      // Uncheck the other defaults
      newTerminals.forEach(t => t.isDefault = false);
    }
    newTerminals[index][field] = value;
    setTerminals(newTerminals);
  };

  const removeTerminal = (index: number) => {
    const newTerminals = [...terminals];
    newTerminals.splice(index, 1);
    setTerminals(newTerminals);
  };

  const handleSaveTerminals = async () => {
    setSavingTerms(true);
    try {
      await savePaymentTerminals(terminals);
      toast.success("Terminales sincronizadas exitosamente");
      loadData(); // reload to get IDs
    } catch (e) {
      toast.error("Error al guardar terminales");
    } finally {
      setSavingTerms(false);
    }
  };

  if (loading) return <div className="py-10 text-center">Cargando la configuración...</div>;

  return (
    <div className="space-y-10 ">

      {/* SECCION 1: DATOS BASICOS */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-brand-600 dark:text-brand-400">
          <Store className="w-6 h-6" />
          <h2 className="text-xl font-bold">Datos del Local</h2>
        </div>
        <div className="bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/10 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1 block text-sm font-medium">Nombre de la Sucursal</Label>
            <Input name="name" value={formData.name} onChange={handleBaseChange} className="w-full text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium">Teléfono</Label>
            <Input name="phone" value={formData.phone} onChange={handleBaseChange} className="w-full text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium">Correo de Soporte</Label>
            <Input name="email" value={formData.email} onChange={handleBaseChange} className="w-full text-sm" />
          </div>
          <div>
            <Label className="mb-1 block text-sm font-medium">Dirección</Label>
            <Input name="address" value={formData.address} onChange={handleBaseChange} className="w-full text-sm" />
          </div>

          <div className="md:col-span-2 mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
            <div className="flex items-center gap-2 mb-4 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5 text-brand-500" />
              <h3 className="text-lg font-bold">Horarios de Operación y Nómina</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Col 1: Visual Schedule */}
              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Horario Visual del Calendario</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1 block text-xs font-medium text-gray-500">Hora de Apertura</Label>
                    <select
                      name="openHour"
                      value={formData.openHour}
                      onChange={handleBaseChange}
                      className="w-full text-sm h-10 rounded-lg border appearance-none px-3 py-2 bg-gray-50 text-gray-800 border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={`open-${i}`} value={i}>
                          {i.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-medium text-gray-500">Hora de Cierre</Label>
                    <select
                      name="closeHour"
                      value={formData.closeHour}
                      onChange={handleBaseChange}
                      className="w-full text-sm h-10 rounded-lg border appearance-none px-3 py-2 bg-gray-50 text-gray-800 border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
                    >
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={`close-${i}`} value={i}>
                          {i.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-3 leading-tight">Define el rango de horas visibles en la cuadrícula principal para el agendamiento.</p>
              </div>

              {/* Col 2: Payroll Config */}
              <div className="bg-white dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <h4 className="text-sm font-bold text-gray-800 dark:text-white/90 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">Cortes de Nómina y Reportes</h4>
                <div>
                  <Label className="mb-1 block text-xs font-medium text-gray-500">Día de Inicio de la Semana</Label>
                  <select
                    name="weekStartDay"
                    value={formData.weekStartDay}
                    onChange={handleBaseChange}
                    className="w-full text-sm h-10 rounded-lg border appearance-none px-3 py-2 bg-gray-50 text-gray-800 border-gray-200 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value={0}>Domingo</option>
                    <option value={1}>Lunes</option>
                    <option value={2}>Martes</option>
                    <option value={3}>Miércoles</option>
                    <option value={4}>Jueves</option>
                    <option value={5}>Viernes</option>
                    <option value={6}>Sábado</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 mt-3 leading-tight">Este día se usará para calcular automáticamente periodos de pago y metas de la sucursal.</p>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end mt-4">
            <Button onClick={handleSaveBase} disabled={savingBase}>
              {savingBase ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Datos y Horario</>}
            </Button>
          </div>
        </div>
      </section>

      {/* SECCION 2: MERCADO PAGO INTEGRACION */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-xl font-bold">Integración Mercado Pago Point</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Configura tus llaves de producción (Production Access Token) y el identificador de la tienda para comunicar el punto de venta web con las terminales físicas.
        </p>

        <div className="bg-blue-50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/40 p-6 rounded-2xl space-y-4">
          <div>
            <Label className="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">Access Token (PROD)</Label>
            <Input
              type="password"
              name="mpAccessToken"
              value={formData.mpAccessToken}
              onChange={handleBaseChange}
              placeholder="APP_USR-..."
              className="w-full text-sm font-mono"
            />
            <span className="text-xs text-gray-400">Token maestro de la API de integraciones.</span>
          </div>
          <div>
            <Label className="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">Store ID (Sucursal)</Label>
            <Input
              name="mpStoreId"
              value={formData.mpStoreId}
              onChange={handleBaseChange}
              placeholder="Ej: SUCURSAL_CENTRO"
              className="w-full text-sm"
            />
            <span className="text-xs text-gray-400">Identificador creado dentro del dashboard de MP.</span>
          </div>

          <div>
            <Label className="mb-1 block text-sm font-bold text-gray-700 dark:text-gray-300">Clave secreta del Webhook</Label>
            <Input
              type="password"
              name="mpWebhookSecret"
              value={formData.mpWebhookSecret}
              onChange={handleBaseChange}
              placeholder="Clave generada al configurar el webhook en MP"
              className="w-full text-sm font-mono"
            />
            <span className="text-xs text-gray-400">Se usa para validar que los avisos de pago vengan realmente de MercadoPago.</span>
          </div>

          {/* URL del webhook para pegar en el panel de MercadoPago */}
          <div className="rounded-xl bg-white dark:bg-gray-900/40 border border-blue-100 dark:border-blue-900/40 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">URL del Webhook (configúrala en MP → Webhooks → Pagos)</p>
            <code className="block text-xs font-mono text-blue-700 dark:text-blue-300 break-all bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
              {(typeof window !== "undefined" ? window.location.origin : "https://TU-DOMINIO")}/api/mp/webhook?businessId={businessId || "<ID_NEGOCIO>"}
            </code>
            <p className="text-[11px] text-gray-400 mt-1">Recibe el monto neto real (ya descontada comisión + IVA) y lo guarda en cada venta.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveBase} disabled={savingBase} variant="primary">
              {savingBase ? "Guardando..." : "Guardar Credenciales"}
            </Button>
          </div>
        </div>
      </section>

      {/* SECCION 3: COLORES DEL LOCAL */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-brand-600 dark:text-brand-400">
          <Palette className="w-6 h-6" />
          <h2 className="text-xl font-bold">Identidad del Local</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Define la paleta de color de la interfaz. Los cambios se previsualizan en tiempo real en esta misma pantalla.
        </p>

        <div className="bg-gray-50 border border-gray-100 dark:bg-white/5 dark:border-white/10 p-6 rounded-2xl space-y-5">

          {/* Barra de previsualización */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Previsualización de paleta</p>
            <div className="flex rounded-xl overflow-hidden h-10 shadow-inner border border-black/5">
              {COLOR_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex-1 transition-colors duration-200"
                  style={{ backgroundColor: themeColors[key] || "#ccc" }}
                  title={COLOR_LABELS[key]}
                />
              ))}
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Paletas predefinidas</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PRESETS).map(([name, colors]) => (
                <button
                  key={name}
                  onClick={() => setThemeColors(colors)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800 text-sm font-medium hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500 transition-colors"
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                    style={{ backgroundColor: colors["--color-brand-500"] }}
                  />
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de inputs */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Tonos personalizados</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {COLOR_KEYS.map((key) => {
                const isPrimary = key === "--color-brand-500";
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border bg-white dark:bg-gray-800 transition-shadow ${
                      isPrimary
                        ? "border-brand-300 dark:border-brand-600 ring-1 ring-brand-400/30"
                        : "border-gray-100 dark:border-gray-700"
                    }`}
                  >
                    {/* Native color picker */}
                    <label className="relative cursor-pointer shrink-0">
                      <span
                        className="block w-9 h-9 rounded-lg border border-black/10 shadow-sm"
                        style={{ backgroundColor: themeColors[key] || "#ccc" }}
                      />
                      <input
                        type="color"
                        value={themeColors[key] || "#000000"}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>

                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-bold leading-tight truncate ${isPrimary ? "text-brand-600 dark:text-brand-400" : "text-gray-600 dark:text-gray-300"}`}>
                        {COLOR_LABELS[key]}
                      </p>
                      <input
                        type="text"
                        value={themeColors[key] || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) handleColorChange(key, v);
                        }}
                        maxLength={7}
                        spellCheck={false}
                        className="text-[11px] font-mono w-full bg-transparent text-gray-400 dark:text-gray-500 outline-none focus:text-gray-700 dark:focus:text-gray-200"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveColors} disabled={savingColors}>
              {savingColors ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Colores</>}
            </Button>
          </div>
        </div>
      </section>

      {/* SECCION 4: TERMINALES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Terminales Físicas (Cajas)</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDetectDevices} disabled={loadingDevices}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loadingDevices ? "animate-spin" : ""}`} />
              {loadingDevices ? "Buscando..." : "Detectar de MercadoPago"}
            </Button>
            <Button variant="outline" size="sm" onClick={addTerminal}>
              <Plus className="w-4 h-4 mr-1" /> Manual
            </Button>
          </div>
        </div>

        {/* Terminales detectadas en MercadoPago */}
        {mpDevices.length > 0 && (
          <div className="mb-5 border border-blue-200 dark:border-blue-900/40 rounded-2xl overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2.5 flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              <Wifi className="w-4 h-4" /> Terminales encontradas en tu cuenta de MercadoPago
            </div>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {mpDevices.map((d) => {
                const isPdv = d.operating_mode === "PDV";
                const alreadyAdded = terminals.some((t) => t.posId === d.id);
                return (
                  <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-transparent">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{d.id}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {isPdv ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> Integrada (PDV)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Standalone — no recibe cobros
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!isPdv && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangeMode(d, "PDV")}
                          disabled={changingMode === d.id}
                        >
                          {changingMode === d.id ? "Activando..." : "Activar PDV"}
                        </Button>
                      )}
                      {isPdv && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm(
                              "¿Volver esta terminal a modo STANDALONE?\n\nDejará de recibir cobros desde el sistema: los cobros con tarjeta dejarán de funcionar en la app hasta reactivar PDV. Tendrás que reiniciar la terminal para que el cambio tome efecto."
                            )) {
                              handleChangeMode(d, "STANDALONE");
                            }
                          }}
                          disabled={changingMode === d.id}
                          className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20"
                        >
                          {changingMode === d.id ? "Cambiando..." : "Volver a Standalone"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => importDevice(d)}
                        disabled={alreadyAdded}
                      >
                        {alreadyAdded ? "Ya agregada" : "Usar esta"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="px-4 py-2.5 text-xs text-gray-500 bg-gray-50 dark:bg-white/2">
              Tras "Activar PDV" debes <b>reiniciar físicamente</b> la terminal para que tome el cambio.
            </p>
          </div>
        )}

        <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="p-4 font-semibold">Caja / Nombre</th>
                <th className="p-4 font-semibold">POS ID (Mercado Pago)</th>
                <th className="p-4 font-semibold">Conexión</th>
                <th className="p-4 font-semibold text-center">Principal</th>
                <th className="p-4 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((t, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-white/5 bg-white dark:bg-transparent">
                  <td className="p-4">
                    <Input
                      value={t.name}
                      onChange={(e) => updateTerminal(i, "name", e.target.value)}
                      placeholder="Ej: Caja Principal"
                      className="w-full text-sm"
                    />
                  </td>
                  <td className="p-4">
                    <Input
                      value={t.posId}
                      onChange={(e) => updateTerminal(i, "posId", e.target.value)}
                      placeholder="Ej: SMARTPOS_1"
                      className="w-full text-sm font-mono"
                    />
                  </td>
                  <td className="p-4">
                    {(() => {
                      const mode = modeForPos(t.posId);
                      if (!t.posId) {
                        return <span className="text-xs text-gray-400">—</span>;
                      }
                      if (mode === null) {
                        return <span className="text-xs text-gray-400">Sin detectar</span>;
                      }
                      const isPdv = mode === "PDV";
                      return (
                        <div className="flex flex-col gap-1.5 items-start">
                          {isPdv ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" /> Integrada (PDV)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" /> Standalone
                            </span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleSavedTerminalMode(t.posId)}
                            disabled={changingMode === t.posId}
                            className={isPdv ? "text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20" : ""}
                          >
                            {changingMode === t.posId
                              ? "Cambiando..."
                              : isPdv ? "Volver a Standalone" : "Activar PDV"}
                          </Button>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-4 text-center">
                    <label className="flex justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={t.isDefault}
                        onChange={(e) => updateTerminal(i, "isDefault", e.target.checked)}
                        className="w-5 h-5 text-brand-500 rounded border-gray-300 focus:ring-brand-500 focus:ring-2"
                      />
                    </label>
                    {t.isDefault && <div className="text-[10px] text-brand-600 font-bold mt-1 uppercase">Predeterminada</div>}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => removeTerminal(i)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {terminals.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    No hay terminales configuradas para este negocio. Haz clic en "Manual" o "Detectar de MercadoPago" para registrar la primera.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {terminals.length > 0 && (
            <div className="bg-gray-50 dark:bg-white/2 p-4 flex justify-end">
              <Button onClick={handleSaveTerminals} disabled={savingTerms}>
                {savingTerms ? "Sincronizando..." : <><CheckCircle2 className="w-4 h-4 mr-2" /> Guardar Terminales</>}
              </Button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

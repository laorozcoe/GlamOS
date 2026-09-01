"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getBusinessSettings, updateBusinessSettings, savePaymentTerminals, updateThemeColors, listMpDevices, changeMpDeviceMode } from "./actions";
import { Save, Plus, Trash2, CheckCircle2, ShieldCheck, Store, Clock, Palette, RefreshCw, Wifi, AlertTriangle, Loader2 } from "lucide-react";
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
    mpAccounts: [] as any[],
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
          mpAccounts: (data.mpAccounts as any[]) || (data.mpAccessToken ? [{ id: "legacy", name: "Principal", mpAccessToken: data.mpAccessToken, mpStoreId: data.mpStoreId || "" }] : []),
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
  const [manualConfigTerminal, setManualConfigTerminal] = useState<any | null>(null);

  const handleDetectDevices = async (explicitToken?: string) => {
    setLoadingDevices(true);
    try {
      // Si pasan un token explícito, lo agregamos. Si no, tomamos el default (undefined) y los ya guardados.
      const tokensToScan = new Set<string | undefined>([undefined]);
      if (explicitToken) {
        tokensToScan.add(explicitToken);
      } else {
        terminals.forEach(t => {
          if (t.mpAccessToken?.trim()) tokensToScan.add(t.mpAccessToken.trim());
        });
      }

      let allDevices: any[] = [];
      let lastError = "";

      for (const token of Array.from(tokensToScan)) {
        const res = await listMpDevices(token);
        if (!res.error && res.devices) {
          // Marcamos de dónde vino para cuando el usuario le de "importar"
          const mapped = res.devices.map(d => ({ ...d, sourceToken: token || "" }));
          allDevices = [...allDevices, ...mapped];
        } else {
          lastError = res.error || "Error";
        }
      }

      // Eliminar duplicados por ID (por si acaso un token es el mismo)
      const uniqueDevices = Array.from(new Map(allDevices.map(item => [item.id, item])).values());
      setMpDevices(uniqueDevices);

      if (uniqueDevices.length === 0) {
        if (explicitToken) toast.error(lastError || "No se encontraron terminales en ese token.");
        else toast.info("No se encontraron terminales en las cuentas.");
      } else if (explicitToken) {
        toast.success(`Se encontraron ${uniqueDevices.length} terminales en total.`);
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
      { id: null, name: friendly, posId: device.id, mpAccessToken: device.sourceToken || "", isDefault: terminals.length === 0 },
    ]);
    toast.success("Terminal agregada. No olvides Guardar Terminales.");
  };

  // Modo actual (PDV/STANDALONE) de una terminal guardada, según lo detectado en MP.
  const modeForPos = (posId: string): string | null =>
    mpDevices.find((d) => d.id === posId)?.operating_mode ?? null;

  // Alterna el modo de una terminal guardada (pide confirmación al volver a Standalone).
  const toggleSavedTerminalMode = (t: any) => {
    const mode = modeForPos(t.posId);
    if (mode === "PDV") {
      if (!window.confirm(
        "¿Volver esta terminal a modo STANDALONE?\n\nDejará de recibir cobros desde el sistema: los cobros con tarjeta dejarán de funcionar en la app hasta reactivar PDV. Tendrás que reiniciar la terminal para que el cambio tome efecto."
      )) return;
      handleChangeMode(t, "STANDALONE");
    } else {
      handleChangeMode(t, "PDV");
    }
  };

  const handleChangeMode = async (device: any, mode: "PDV" | "STANDALONE") => {
    setChangingMode(device.posId);
    try {
      const res = await changeMpDeviceMode(device.posId, mode, device.mpAccessToken);
      if (res.isManualRequired) {
        setManualConfigTerminal(device);
      } else if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Modo cambiado a ${mode}. Reinicia la terminal para aplicar el cambio.`);
        setMpDevices((prev) =>
          prev.map((d) => (d.id === device.posId ? { ...d, operating_mode: mode } : d))
        );
      }
    } catch {
      toast.error("Error al cambiar el modo de la terminal");
    } finally {
      setChangingMode(null);
    }
  };

  const addTerminal = () => {
    setTerminals([...terminals, { id: null, name: "", posId: "", mpAccessToken: "", isDefault: terminals.length === 0 }]);
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
    
      {manualConfigTerminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Configuración Manual Requerida</h3>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-6 text-left space-y-2">
                <p>
                  Por seguridad, tu modelo de terminal física (<strong>{manualConfigTerminal?.name}</strong>) no permite que cambiemos el modo automáticamente desde internet.
                </p>
                <p className="font-bold mt-2 text-gray-800 dark:text-gray-200">Sigue estos pasos en la pantalla de tu terminal física:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Entra al <strong>Menú</strong> principal (ícono de engranaje o tres líneas).</li>
                  <li>Ve a <strong>Configuración</strong> o Ajustes.</li>
                  <li>Selecciona <strong>Modo de Operación</strong>.</li>
                  <li>Cámbialo a modo <strong>PDV / Integrado</strong>.</li>
                  <li><strong className="text-brand-600 dark:text-brand-400">Apaga y prende</strong> tu terminal.</li>
                </ol>
                <p className="text-xs text-gray-500 mt-2 text-center">Una vez que hagas esto, el sistema la detectará conectada al refrescar la página.</p>
              </div>
              <Button 
                onClick={() => setManualConfigTerminal(null)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
              >
                Entendido, ya lo hice
              </Button>
            </div>
          </div>
        </div>
      )}
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

      {/* SECCION 2: CUENTAS MERCADO PAGO */}
      <section>
        <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-xl font-bold">Cuentas de Mercado Pago</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Agrega aquí las cuentas de Mercado Pago que usarás para cobrar. Una vez agregadas, baja a "Terminales Físicas" y dale a Detectar.
        </p>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg dark:bg-yellow-900/20">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mr-3 shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-bold">¿Es obligatorio llenar el Webhook Secret?</span> No. La terminal funcionará y registrará tus cobros perfectamente sin él. 
              Sin embargo, te recomendamos llenarlo si quieres que tus reportes de ganancias en el sistema sean exactos "al centavo", 
              ya que el webhook es la única forma en que Mercado Pago nos notifica la comisión final exacta que te descontaron de cada venta.
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/40 p-6 rounded-2xl space-y-6 mb-12">
          <div className="space-y-4">
            {formData.mpAccounts.map((acc, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800 rounded-xl p-4 relative">
                <button
                  onClick={() => {
                    const newAccounts = [...formData.mpAccounts];
                    newAccounts.splice(i, 1);
                    setFormData({ ...formData, mpAccounts: newAccounts });
                  }}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-10">
                  <div>
                    <Label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Identificador</Label>
                    <Input
                      value={acc.name}
                      onChange={(e) => {
                        const newAccounts = [...formData.mpAccounts];
                        newAccounts[i].name = e.target.value;
                        setFormData({ ...formData, mpAccounts: newAccounts });
                      }}
                      placeholder="Ej: Cuenta Ana"
                      className="w-full text-sm font-bold"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Access Token</Label>
                    <Input
                      type="password"
                      value={acc.mpAccessToken}
                      onChange={(e) => {
                        const newAccounts = [...formData.mpAccounts];
                        newAccounts[i].mpAccessToken = e.target.value;
                        setFormData({ ...formData, mpAccounts: newAccounts });
                      }}
                      placeholder="APP_USR-..."
                      className="w-full text-sm font-mono"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Store ID (Opcional)</Label>
                    <Input
                      value={acc.mpStoreId}
                      onChange={(e) => {
                        const newAccounts = [...formData.mpAccounts];
                        newAccounts[i].mpStoreId = e.target.value;
                        setFormData({ ...formData, mpAccounts: newAccounts });
                      }}
                      placeholder="Ej: SUCURSAL_1"
                      className="w-full text-sm font-mono"
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block text-xs font-bold text-gray-700 dark:text-gray-300">Webhook Secret</Label>
                    <Input
                      type="password"
                      value={acc.webhookSecret || ""}
                      onChange={(e) => {
                        const newAccounts = [...formData.mpAccounts];
                        newAccounts[i].webhookSecret = e.target.value;
                        setFormData({ ...formData, mpAccounts: newAccounts });
                      }}
                      placeholder="Clave secreta"
                      className="w-full text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={() => setFormData({
              ...formData,
              mpAccounts: [...formData.mpAccounts, { id: crypto.randomUUID(), name: "", mpAccessToken: "", mpStoreId: "" }]
            })}
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Cuenta
          </Button>



          <div className="rounded-xl bg-white dark:bg-gray-900/40 border border-blue-100 dark:border-blue-900/40 p-4">
            <p className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">URL del Webhook (configúrala en MP → Webhooks → Pagos)</p>
            <code className="block text-xs font-mono text-blue-700 dark:text-blue-300 break-all bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
              {(typeof window !== "undefined" ? window.location.origin : "https://TU-DOMINIO")}/api/mp/webhook?businessId={businessId || "<ID_NEGOCIO>"}
            </code>
            <p className="text-[11px] text-gray-400 mt-1">Recibe el monto neto real (ya descontada comisión + IVA) y lo guarda en cada venta.</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveBase} disabled={savingBase} variant="primary">
              {savingBase ? "Guardando..." : "Guardar Cuentas"}
            </Button>
          </div>
        </div>
      </section>

      {/* SECCION 4: TERMINALES */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold">Terminales Físicas (Cajas)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Agrega tus cajas. Si una terminal es de otra socia, pega su Access Token y haz clic en Detectar.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => handleDetectDevices()} disabled={loadingDevices}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingDevices ? "animate-spin" : ""}`} />
              {loadingDevices ? "Buscando..." : "Detectar Terminales"}
            </Button>
            <Button variant="outline" onClick={addTerminal}>
              <Plus className="w-4 h-4 mr-2" /> Agregar Manual
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {terminals.map((t, i) => {
            const mode = modeForPos(t.posId);
            const isPdv = mode === "PDV";
            return (
              <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                {/* Header (Nombre y Acciones) */}
                <div className="bg-gray-50 dark:bg-white/5 p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Nombre de la Caja</Label>
                    <Input
                      value={t.name}
                      onChange={(e) => updateTerminal(i, "name", e.target.value)}
                      placeholder="Ej: Caja Ana"
                      className="w-full text-sm font-bold bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                    />
                  </div>
                  <button onClick={() => removeTerminal(i)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0 mt-4">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Body (Identificadores) */}
                <div className="p-4 space-y-4 flex-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1">POS ID (Terminal)</Label>
                      <Input
                        value={t.posId}
                        onChange={(e) => updateTerminal(i, "posId", e.target.value)}
                        placeholder="Ej: SMARTPOS_1"
                        className="w-full text-xs font-mono bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-bold text-gray-500 mb-1">Cuenta Origen</Label>
                      <div className="w-full text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg truncate border border-blue-200 dark:border-blue-800">
                        {t.mpAccessToken ? (formData.mpAccounts.find((a: any) => a.mpAccessToken === t.mpAccessToken)?.name || "Cuenta Externa") : "Desconocida"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer (Estado y Modo) */}
                <div className="bg-gray-50 dark:bg-white/2 p-4 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {!t.posId ? (
                      <span className="text-xs text-gray-400 font-medium">Esperando POS ID...</span>
                    ) : mode === null ? (
                      <span className="text-xs text-gray-400 font-medium">Sin detectar</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {isPdv ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3 h-3" /> Integrada (PDV)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertTriangle className="w-3 h-3" /> Standalone
                          </span>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSavedTerminalMode(t)}
                          disabled={changingMode === t.posId}
                          className={`text-[11px] h-7 px-2 ${isPdv ? "text-amber-600 border-amber-300 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-900/20" : ""}`}
                        >
                          {changingMode === t.posId ? "Cambiando..." : isPdv ? "Volver Standalone" : "Activar PDV"}
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer group shrink-0">
                    <input
                      type="checkbox"
                      checked={t.isDefault}
                      onChange={(e) => updateTerminal(i, "isDefault", e.target.checked)}
                      className="w-4 h-4 text-brand-500 rounded border-gray-300 focus:ring-brand-500 focus:ring-2 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 group-hover:text-brand-600">Caja Principal</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        
        {terminals.length === 0 && (
          <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl mb-4">
            No hay terminales configuradas para este negocio. Haz clic en "Agregar Caja" o "Detectar Terminales".
          </div>
        )}

        {terminals.length > 0 && (
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveTerminals} disabled={savingTerms}>
              {savingTerms ? "Sincronizando..." : <><CheckCircle2 className="w-4 h-4 mr-2" /> Guardar Terminales</>}
            </Button>
          </div>
        )}
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



    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { getBusinessSettings, updateBusinessSettings, savePaymentTerminals } from "./actions";
import { Save, Plus, Trash2, CheckCircle2, ShieldCheck, Store } from "lucide-react";
import { toast } from "react-toastify";

export default function SettingsClient() {
  const [loading, setLoading] = useState(true);
  const [savingBase, setSavingBase] = useState(false);
  const [savingTerms, setSavingTerms] = useState(false);

  // Base Data Form
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    mpAccessToken: "",
    mpStoreId: ""
  });

  // Terminals 
  const [terminals, setTerminals] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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
          mpStoreId: data.mpStoreId || ""
        });
        setTerminals(data.terminals || []);
      }
    } catch (e) {
      toast.error("Error al cargar configuraciones");
    } finally {
      setLoading(false);
    }
  };

  const handleBaseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="space-y-10 max-w-4xl">

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

          <div className="md:col-span-2 flex justify-end mt-2">
            <Button onClick={handleSaveBase} disabled={savingBase}>
              {savingBase ? "Guardando..." : <><Save className="w-4 h-4 mr-2" /> Guardar Datos</>}
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

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveBase} disabled={savingBase} variant="primary">
              {savingBase ? "Guardando..." : "Guardar Credenciales"}
            </Button>
          </div>
        </div>
      </section>

      {/* SECCION 3: TERMINALES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">Terminales Físicas (Cajas)</h2>
          <Button variant="outline" size="sm" onClick={addTerminal}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Terminal
          </Button>
        </div>

        <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
              <tr>
                <th className="p-4 font-semibold">Caja / Nombre</th>
                <th className="p-4 font-semibold">POS ID (Mercado Pago)</th>
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
                  <td colSpan={4} className="p-6 text-center text-gray-500">
                    No hay terminales configuradas para este negocio. Haz clic en "Nueva Terminal" para registrar la primera.
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

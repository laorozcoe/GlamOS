"use client";

import React, { useState, useEffect } from "react";
import Input from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { getCardNetSummary, requestSettlementReport, listSettlementReports, getSettlementCsv } from "./actions";
import { toast } from "react-toastify";
import { RefreshCw, Download, FileText, TrendingDown, Wallet, CreditCard } from "lucide-react";

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
const money = (n: number) => `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Convierte el timestamp de MercadoPago a hora local de México.
// Ojo: en el listado de reportes, MP envía la hora en UTC pero con un offset
// ERRÓNEO (ej. "...T19:58:08-04:00" cuando 19:58 ya es UTC). Por eso ignoramos
// el offset que viene y tratamos la parte de fecha/hora como UTC.
const fmtFecha = (iso: string) => {
  if (!iso) return "";
  try {
    const m = iso.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    const base = m ? `${m[0]}Z` : iso;
    return new Date(base).toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function SettlementsClient() {
  const [begin, setBegin] = useState(monthStartStr());
  const [end, setEnd] = useState(todayStr());

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [reports, setReports] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [csvTotals, setCsvTotals] = useState<{ file: string; fees: number; taxes: number; rows: number } | null>(null);

  // MercadoPago rechaza el formato con milisegundos (.000Z) → usar segundos exactos.
  const beginISO = `${begin}T00:00:00Z`;
  const endISO = `${end}T23:59:59Z`;

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await getCardNetSummary(beginISO, endISO);
      setSummary(res);
    } catch {
      toast.error("Error al calcular el resumen");
    } finally {
      setLoadingSummary(false);
    }
  };

  const generateReport = async () => {
    setBusy(true);
    try {
      const res = await requestSettlementReport(beginISO, endISO);
      if (res.error) toast.error(res.error);
      else toast.success("Reporte solicitado. Tarda unos minutos; la lista se actualiza sola.");
    } catch {
      toast.error("Error al generar el reporte");
    } finally {
      setBusy(false);
    }
  };

  // Refresco silencioso de la lista (sin toasts), usado por el polling automático.
  const pollList = async () => {
    setListRefreshing(true);
    try {
      const res = await listSettlementReports();
      if (!res.error) setReports(res.reports || []);
    } catch {
      /* el polling no molesta con errores */
    } finally {
      setListRefreshing(false);
    }
  };

  // Al entrar: calcula el resumen del periodo y arranca el auto-refresco de la lista cada 5s.
  useEffect(() => {
    loadSummary();
    pollList();
    const id = setInterval(pollList, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadCsv = async (fileName: string) => {
    setBusy(true);
    try {
      const res = await getSettlementCsv(fileName);
      if (res.error || !res.csv) {
        toast.error(res.error || "No disponible aún");
        return;
      }
      // Descargar el archivo oficial
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      if (res.totals) setCsvTotals({ file: fileName, ...res.totals });
    } catch {
      toast.error("Error al descargar el reporte");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Rango de fechas */}
      <div className="flex flex-wrap items-end gap-3 bg-white dark:bg-white/3 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Desde</label>
          <Input type="date" value={begin} onChange={(e) => setBegin(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">Hasta</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="text-sm" />
        </div>
        <Button onClick={loadSummary} disabled={loadingSummary}>
          {loadingSummary ? "Calculando..." : "Ver resumen del periodo"}
        </Button>
      </div>

      {/* Resumen confiable (nuestra BD) */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-4 bg-white dark:bg-white/3">
            <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase mb-1"><CreditCard className="w-4 h-4" /> Cobrado con tarjeta</div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{money(summary.cobrado)}</p>
            <p className="text-xs text-gray-400 mt-1">{summary.count} cobro(s)</p>
          </div>
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 p-4 bg-amber-50 dark:bg-amber-900/10">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase mb-1"><TrendingDown className="w-4 h-4" /> Comisión MP (incl. IVA)</div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400">-{money(summary.comision)}</p>
          </div>
          <div className="rounded-2xl border border-green-200 dark:border-green-900/40 p-4 bg-green-50 dark:bg-green-900/10">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs font-bold uppercase mb-1"><Wallet className="w-4 h-4" /> Neto recibido</div>
            <p className="text-2xl font-black text-green-700 dark:text-green-400">{money(summary.neto)}</p>
            <p className="text-xs text-gray-400 mt-1">Tras comisión + IVA de la comisión</p>
          </div>
        </div>
      )}

      {/* Reporte oficial de MercadoPago */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 overflow-hidden">
        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3">
          <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300 font-bold">
            <FileText className="w-5 h-5" /> Reporte oficial de Liquidaciones (MercadoPago)
          </div>
          <p className="text-xs text-blue-700/80 dark:text-blue-300/70 mt-1">
            Fuente de verdad del depósito real al banco, incluye retenciones fiscales (ISR/IVA) si aplican a tu régimen.
            La generación tarda unos minutos.
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={generateReport} disabled={busy} variant="primary">
              Generar reporte del periodo
            </Button>
            {listRefreshing && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Actualizando lista...
              </span>
            )}
          </div>

          {reports.length > 0 && (
            <div className="divide-y divide-gray-100 dark:divide-white/5 border border-gray-100 dark:border-white/10 rounded-xl">
              {reports.map((r) => (
                <div key={r.file_name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">{r.file_name}</p>
                    <p className="text-[11px] text-gray-400">{fmtFecha(r.date_created)} · {r.status}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadCsv(r.file_name)} disabled={busy}>
                    <Download className="w-4 h-4 mr-1" /> Descargar CSV
                  </Button>
                </div>
              ))}
            </div>
          )}

          {csvTotals && (
            <div className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-4 text-sm">
              <p className="font-bold text-gray-700 dark:text-gray-200 mb-2">Totales del reporte descargado</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div><span className="text-gray-400 text-xs block">Comisiones</span><span className="font-bold">-{money(csvTotals.fees)}</span></div>
                <div><span className="text-gray-400 text-xs block">Impuestos / retenciones</span><span className="font-bold">-{money(csvTotals.taxes)}</span></div>
                <div><span className="text-gray-400 text-xs block">Movimientos</span><span className="font-bold">{csvTotals.rows}</span></div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Para el depósito exacto al banco, revisa el CSV (columnas BALANCE_AMOUNT y movimientos de retiro).</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        <b>Nota:</b> el <b>Neto recibido</b> de arriba sale de los datos reales de cada cobro (lo que MercadoPago reporta como neto tras su comisión). Las <b>retenciones fiscales</b> de ISR/IVA, cuando aplican, se descuentan a nivel de liquidación mensual y se ven en el <b>reporte oficial</b>, no por venta.
      </p>
    </div>
  );
}

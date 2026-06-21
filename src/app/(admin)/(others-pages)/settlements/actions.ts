"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";

const SIMULATE = process.env.MP_SIMULATE === "true";

async function getMpToken() {
  const ctx = await getBusiness();
  if (!ctx) throw new Error("No business found");
  const biz = await prisma.business.findUnique({
    where: { id: ctx.id },
    select: { mpAccessToken: true },
  });
  return { businessId: ctx.id, token: biz?.mpAccessToken ?? null };
}

// ── Resumen confiable desde NUESTRA base de datos (cobros con terminal) ──
// Suma lo que realmente capturamos por venta: cobrado, comisión y NETO real.
export async function getCardNetSummary(beginISO: string, endISO: string) {
  const ctx = await getBusiness();
  if (!ctx) throw new Error("No business found");

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
        COUNT(*)::int                       AS count,
        COALESCE(SUM("total"), 0)           AS cobrado,
        COALESCE(SUM("mpFee"), 0)           AS comision,
        COALESCE(SUM("mpNetReceived"), 0)   AS neto,
        COALESCE(SUM("mpTaxes"), 0)         AS impuestos
     FROM "Sale"
     WHERE "businessId" = $1
       AND "active" = true
       AND "mpPaymentId" IS NOT NULL
       AND "createdAt" >= $2::timestamptz
       AND "createdAt" <= $3::timestamptz`,
    ctx.id, beginISO, endISO
  ) as any[];

  const r = rows[0] || {};
  return {
    count: Number(r.count || 0),
    cobrado: Number(r.cobrado || 0),
    comision: Number(r.comision || 0),
    neto: Number(r.neto || 0),
    impuestos: Number(r.impuestos || 0),
  };
}

// ── Reporte oficial de Liquidaciones de MercadoPago (fuente de verdad del depósito) ──

// Genera el reporte (asíncrono: tarda unos minutos en estar disponible).
export async function requestSettlementReport(beginISO: string, endISO: string) {
  if (SIMULATE) return { ok: true, simulated: true };
  const { token } = await getMpToken();
  if (!token) return { error: "No hay Access Token de MercadoPago configurado." };

  const res = await fetch("https://api.mercadopago.com/v1/account/release_report", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ begin_date: beginISO, end_date: endISO }),
  });
  if (!res.ok && res.status !== 202) {
    const t = await res.text();
    return { error: `No se pudo generar el reporte (${res.status}): ${t.slice(0, 200)}` };
  }
  return { ok: true };
}

// Lista los reportes generados (para saber cuándo está listo y su file_name).
export async function listSettlementReports() {
  if (SIMULATE) {
    return { reports: [{ file_name: "SIM-reporte.csv", begin_date: "", end_date: "", date_created: "", status: "enabled" }] };
  }
  const { token } = await getMpToken();
  if (!token) return { error: "No hay Access Token de MercadoPago configurado." };

  const res = await fetch("https://api.mercadopago.com/v1/account/release_report/list", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { error: "No se pudo listar los reportes" };
  const data = await res.json();
  const reports = (Array.isArray(data) ? data : []).map((d: any) => ({
    file_name: d.file_name,
    begin_date: d.begin_date,
    end_date: d.end_date,
    date_created: d.date_created,
    status: d.status,
  }));
  return { reports };
}

// Descarga el CSV oficial y devuelve su contenido (para que el navegador lo guarde).
// Además calcula totales seguros: Σ comisiones y Σ impuestos/retenciones.
export async function getSettlementCsv(fileName: string) {
  if (SIMULATE) {
    return { csv: "DATE;DESCRIPTION;MP_FEE_AMOUNT;TAXES_AMOUNT\n(sim)\n", totals: { fees: 0, taxes: 0, rows: 0 } };
  }
  const { token } = await getMpToken();
  if (!token) return { error: "No hay Access Token de MercadoPago configurado." };

  const res = await fetch(
    `https://api.mercadopago.com/v1/account/release_report/${encodeURIComponent(fileName)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return { error: "El archivo no está disponible (puede tardar unos minutos en generarse)." };

  const csv = await res.text();

  // Totales seguros (columnas por-cargo, no afectadas por el modelo de reserva):
  // MP_FEE_AMOUNT (col 7) y TAXES_AMOUNT (col 8). Encabezado en la primera línea.
  let fees = 0, taxes = 0, rows = 0;
  const lines = csv.split("\n").map((l) => l.replace(/\r$/, ""));
  const header = (lines[0] || "").split(";");
  const feeIdx = header.indexOf("MP_FEE_AMOUNT");
  const taxIdx = header.indexOf("TAXES_AMOUNT");
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = lines[i].split(";");
    rows++;
    if (feeIdx >= 0) fees += Number(cols[feeIdx]) || 0;
    if (taxIdx >= 0) taxes += Number(cols[taxIdx]) || 0;
  }

  return {
    csv,
    totals: {
      fees: Math.round(fees * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      rows,
    },
  };
}

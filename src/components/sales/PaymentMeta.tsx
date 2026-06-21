import React from "react";
import { Banknote, CreditCard, ArrowLeftRight } from "lucide-react";

// Colores alineados con el dashboard: Efectivo=verde, Tarjeta=azul, Transferencia=violeta.
const METHOD_META: Record<string, { label: string; cls: string; Icon: any }> = {
  CASH: {
    label: "Efectivo",
    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    Icon: Banknote,
  },
  CARD: {
    label: "Tarjeta",
    cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
    Icon: CreditCard,
  },
  TRANSFER: {
    label: "Transferencia",
    cls: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800",
    Icon: ArrowLeftRight,
  },
};

export function getSaleMethods(sale: any): string[] {
  const set = new Set<string>();
  (sale?.payments || []).forEach((p: any) => p?.method && set.add(p.method));
  return Array.from(set);
}

// Pill(s) de método de pago con el color del dashboard.
export function PaymentMethodBadge({ sale }: { sale: any }) {
  const methods = getSaleMethods(sale);
  if (methods.length === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500 dark:border-white/10 dark:bg-white/5">
        N/A
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {methods.map((m) => {
        const meta = METHOD_META[m] || {
          label: m,
          cls: "bg-gray-100 text-gray-600 border-gray-200",
          Icon: CreditCard,
        };
        const Icon = meta.Icon;
        return (
          <span
            key={m}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.cls}`}
          >
            <Icon className="w-3 h-3" /> {meta.label}
          </span>
        );
      })}
    </div>
  );
}

// ¿La venta tiene cobro con terminal MercadoPago (y por tanto comisión)?
export function isMpSale(sale: any): boolean {
  return !!sale?.mpPaymentId && sale?.mpFee != null;
}

export function saleNet(sale: any): number {
  if (sale?.mpNetReceived != null) return Number(sale.mpNetReceived);
  if (isMpSale(sale)) return Number(sale.total) - Number(sale.mpFee);
  return Number(sale?.total || 0);
}

// Monto de la venta con el NETO como valor dominante.
// Para cobros MP: neto grande (verde) + bruto tachado y comisión en chico.
// Para el resto: el total normal.
export function SaleAmount({ sale }: { sale: any }) {
  const total = Number(sale?.total || 0);

  if (!isMpSale(sale)) {
    return <span className="text-base font-bold text-brand-500 dark:text-brand-400">${total.toFixed(2)}</span>;
  }

  const net = saleNet(sale);
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-bold text-green-600 dark:text-green-400">${net.toFixed(2)}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-green-600/70 dark:text-green-400/70">neto</span>
      </div>
      <p className="text-[11px] leading-tight text-gray-400">
        <span className="line-through">${total.toFixed(2)}</span>
        <span className="text-orange-500 dark:text-orange-400"> · comisión -${Number(sale.mpFee).toFixed(2)}</span>
      </p>
    </div>
  );
}

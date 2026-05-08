"use client";

import { useEffect, useState } from "react";
import {Modal} from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import { Tag, Package, CalendarDays } from "lucide-react";
import { getActiveCoupons } from "@/app/(admin)/(others-pages)/coupons/actions";

interface CouponItem {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  minPurchase: number;
  limitType: string;
  totalStock: number;
  usedCount: number;
  endDate: string | Date;
}

interface CouponSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  subtotal: number;
}

interface LoadedData {
  coupons: CouponItem[];
  now: number;
}

export function CouponSearchModal({
  isOpen,
  onClose,
  onSelect,
  subtotal,
}: CouponSearchModalProps) {
  const [data, setData] = useState<LoadedData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    getActiveCoupons()
      .then((rows) => setData({ coupons: rows as CouponItem[], now: Date.now() }))
      .catch(() => setData({ coupons: [], now: Date.now() }));
  }, [isOpen]);

  const loading = isOpen && data === null;

  const handleSelect = (coupon: CouponItem) => {
    onSelect(coupon.code);
    onClose();
  };

  const handleClose = () => {
    setData(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md w-full m-4">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-800 dark:text-white mb-1">
          Cupones disponibles
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Total de la compra: <span className="font-semibold">${subtotal.toLocaleString()}</span>
        </p>

        {loading ? (
          <div className="py-10 text-center text-sm text-gray-400">Cargando cupones...</div>
        ) : data?.coupons.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-gray-400 dark:text-gray-500">
            <Tag className="w-8 h-8 opacity-40" />
            <p className="text-sm">No hay cupones activos disponibles</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {data?.coupons.map((c) => {
              const meetsMin = subtotal >= c.minPurchase;
              const remaining =
                c.limitType !== "DATE" ? c.totalStock - c.usedCount : null;
              const daysLeft = Math.max(
                0,
                Math.ceil((new Date(c.endDate).getTime() - (data?.now ?? 0)) / 86400000)
              );

              return (
                <button
                  key={c.id}
                  onClick={() => meetsMin && handleSelect(c)}
                  disabled={!meetsMin}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    meetsMin
                      ? "border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 cursor-pointer"
                      : "border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed bg-gray-50/50 dark:bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-brand-600 dark:text-brand-400 text-sm">
                        {c.code}
                      </span>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                        {c.name}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-gray-800 dark:text-white whitespace-nowrap">
                      {c.type === "PERCENTAGE" ? `${c.value}% off` : `$${c.value} off`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {remaining !== null && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {remaining} usos restantes
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {daysLeft} días
                    </span>
                    {c.minPurchase > 0 && (
                      <span className={!meetsMin ? "text-red-500 font-medium" : ""}>
                        Mín. ${c.minPurchase}
                        {!meetsMin && " — no aplica"}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

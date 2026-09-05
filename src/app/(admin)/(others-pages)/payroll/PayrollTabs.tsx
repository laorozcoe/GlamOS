"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Clock, Gift } from "lucide-react";

const PESTANAS = [
  { href: "/payroll", label: "Resumen", icono: <Wallet className="size-4" /> },
  { href: "/payroll/asistencia", label: "Asistencia", icono: <Clock className="size-4" /> },
  { href: "/payroll/bonos", label: "Bonos", icono: <Gift className="size-4" /> },
];

/**
 * Las tres pantallas que producen un pago, juntas.
 *
 * Antes la nomina, la asistencia que la alimenta y los bonos que la componen
 * eran entradas sueltas del menu, en niveles distintos: para entender un pago
 * habia que recorrerlas.
 *
 * En pantalla angosta la fila scrollea en horizontal en vez de apilarse: tres
 * pestanas apiladas empujan el contenido fuera de la primera vista.
 */
export default function PayrollTabs() {
  const pathname = usePathname();

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <nav className="flex w-max min-w-full gap-1 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
        {PESTANAS.map((p) => {
          const activa = pathname === p.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-current={activa ? "page" : undefined}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-medium transition-colors ${
                activa
                  ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              {p.icono}
              {p.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

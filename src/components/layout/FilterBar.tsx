import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface FilterBarProps {
  children: ReactNode;
  /** Acciones al final de la barra (aplicar, exportar...). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Fila de filtros de una sección.
 *
 * Reemplaza las barras a medida de Reportes, Asistencia y Liquidaciones, que
 * eran tres soluciones distintas al mismo problema y ninguna sobrevivía a una
 * pantalla angosta: los campos se desbordaban o se aplastaban.
 *
 * El corte lo decide una container query y no el viewport, porque una barra de
 * filtros puede vivir a página completa o dentro de una columna estrecha, y lo
 * que importa es el espacio que tiene, no el tamaño de la ventana. Es también
 * lo que la hace comportarse bien en tablet vertical.
 *
 * Los campos crecen a partes iguales hasta un mínimo legible; si no caben,
 * bajan de línea en vez de encogerse.
 */
export default function FilterBar({ children, actions, className = "" }: FilterBarProps) {
  return (
    <div
      className={twMerge(
        "@container rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/3",
        className
      )}
    >
      <div className="flex flex-col gap-3 @2xl:flex-row @2xl:flex-wrap @2xl:items-end">
        <div className="flex flex-col gap-3 @2xl:flex-1 @2xl:flex-row @2xl:flex-wrap @2xl:items-end [&>*]:min-w-[10rem] @2xl:[&>*]:flex-1">
          {children}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 [&>*]:flex-1 @2xl:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

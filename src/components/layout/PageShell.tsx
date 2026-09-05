import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

interface PageShellProps {
  title: ReactNode;
  description?: ReactNode;
  /** Botones o controles de la sección. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Encabezado de sección: título, descripción y acciones.
 *
 * Cada pantalla armaba el suyo a mano, así que ninguno coincidía con otro en
 * tamaños, separaciones ni en cómo se comportaba al angostar.
 *
 * En pantalla angosta el bloque se apila y las acciones van a lo ancho: un
 * botón de 44px que ocupa toda la fila se toca sin apuntar. Desde `sm` vuelve
 * a ser título a la izquierda y acciones a la derecha.
 */
export default function PageShell({
  title,
  description,
  actions,
  children,
  className = "",
}: PageShellProps) {
  return (
    <div className={twMerge("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between dark:border-white/5">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white/90">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

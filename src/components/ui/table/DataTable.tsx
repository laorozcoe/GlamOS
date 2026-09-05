"use client";

import React, { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type Column<T> = {
  /** Identificador unico de la columna. */
  key: string;
  header: ReactNode;
  /** Como se pinta la celda. Recibe la fila completa. */
  cell: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  /** No mostrar en la vista de tarjeta (pantallas angostas). */
  hideOnCard?: boolean;
  /** No mostrar en la vista de tabla (pantallas anchas). */
  hideOnTable?: boolean;
  /**
   * Marca la columna que sirve de titulo de la tarjeta. Debe haber una sola.
   * Si no se marca ninguna, se usa la primera.
   */
  primary?: boolean;
  className?: string;
  headerClassName?: string;
};

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Clave estable por fila. */
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  /** Que mostrar cuando no hay filas. */
  empty?: ReactNode;
  loading?: boolean;
  className?: string;
  /** Acciones al pie de cada tarjeta (solo vista angosta). */
  cardFooter?: (row: T) => ReactNode;
}

const alignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

/**
 * Tabla que se convierte en lista de tarjetas cuando no cabe.
 *
 * Reemplaza el patron de tener dos componentes (Table.jsx + TableMobile.jsx) y
 * elegir entre ellos con `window.innerWidth`, que ademas de duplicar el codigo
 * provoca un parpadeo en el primer render porque el servidor no conoce el
 * ancho de la pantalla.
 *
 * El corte lo decide una CONTAINER QUERY (`@container`), no el ancho de la
 * ventana: el componente mide el espacio que realmente tiene disponible. Por
 * eso la misma tabla se ve como tarjetas dentro de un modal angosto y como
 * tabla a pantalla completa, sin configurar nada. Es tambien lo que resuelve
 * el caso de la tablet vertical, donde la ventana es ancha pero la columna de
 * contenido no lo es.
 *
 * Se pintan los dos arboles y se alterna con CSS. Cuesta algo de DOM, pero a
 * cambio la vista de tarjeta puede ser genuinamente distinta -no una tabla
 * apretada- que es lo que hace falta en celular.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty = "Sin registros",
  loading = false,
  className = "",
  cardFooter,
}: DataTableProps<T>) {
  const tableCols = columns.filter((c) => !c.hideOnTable);
  const cardCols = columns.filter((c) => !c.hideOnCard);
  const primary = cardCols.find((c) => c.primary) ?? cardCols[0];
  const rest = cardCols.filter((c) => c !== primary);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        Cargando...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-gray-500">
        {empty}
      </div>
    );
  }

  return (
    <div className={twMerge("@container w-full", className)}>
      {/* ---------- Vista tabla: solo cuando el contenedor pasa de 48rem ---- */}
      <div className="hidden overflow-x-auto @3xl:block">
        <table className="w-full min-w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-white/10">
              {tableCols.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={twMerge(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400",
                    alignClass[col.align ?? "left"],
                    col.headerClassName
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={twMerge(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5"
                )}
              >
                {tableCols.map((col) => (
                  <td
                    key={col.key}
                    className={twMerge(
                      "px-4 py-3 text-sm text-gray-700 dark:text-gray-300",
                      alignClass[col.align ?? "left"],
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------- Vista tarjeta: contenedor angosto ---------------------- */}
      <ul className="flex flex-col gap-3 @3xl:hidden">
        {rows.map((row, i) => (
          <li
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={twMerge(
              "rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/3",
              // 44px de area de toque minima en pantallas tactiles.
              onRowClick && "min-h-11 cursor-pointer active:bg-gray-50 dark:active:bg-white/5"
            )}
          >
            {primary && (
              <div className="mb-2 text-base font-semibold text-gray-800 dark:text-white/90">
                {primary.cell(row)}
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {rest.map((col) => (
                <div key={col.key} className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {col.header}
                  </dt>
                  <dd className="truncate text-sm text-gray-700 dark:text-gray-300">
                    {col.cell(row)}
                  </dd>
                </div>
              ))}
            </dl>

            {cardFooter && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/5">
                {cardFooter(row)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

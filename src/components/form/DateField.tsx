"use client";

import React, { FC } from "react";
import { Calendar, Clock } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Label from "./Label";

type FieldType = "date" | "time" | "datetime-local" | "month";

interface DateFieldProps {
  /** Valor en formato nativo: "YYYY-MM-DD" para date, "HH:mm" para time. */
  value?: string;
  /** Recibe el valor ya desempaquetado, no el evento. */
  onChange?: (value: string) => void;
  type?: FieldType;
  id?: string;
  name?: string;
  label?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
  /** Clases para el <input>. */
  className?: string;
  /** Clases para el contenedor. Util para anchos: "w-full sm:w-48". */
  containerClassName?: string;
  /**
   * "default" = campo con borde propio.
   * "bare"    = sin borde ni fondo, para incrustarlo dentro de un control ya
   *             enmarcado (por ejemplo la barra de rango de fechas de
   *             Reportes). Evita tener que re-implementar el comportamiento
   *             del selector con CSS suelto en cada pantalla.
   */
  variant?: "default" | "bare";
}

/**
 * Campo de fecha / hora unico para toda la app.
 *
 * Usa el selector nativo del sistema operativo a proposito: en celular y
 * tablet abre la rueda de iOS/Android, que es mas grande, mas rapida y ya
 * conocida por el usuario que cualquier calendario dibujado en HTML.
 *
 * Al tocar CUALQUIER parte del campo se abre el selector, no solo el icono:
 *   - Chrome/Edge/Safari: por CSS, `.field-datetime` estira el boton nativo
 *     hasta cubrir todo el input (ver globals.css).
 *   - Firefox: por JS, con showPicker() en el onClick.
 *
 * Alto minimo de 44px (h-11) en todos los tamanos, que es el area de toque
 * minima recomendada por Apple y Google.
 */
const DateField: FC<DateFieldProps> = ({
  value,
  onChange,
  type = "date",
  id,
  name,
  label,
  min,
  max,
  step,
  disabled = false,
  error = false,
  hint,
  className = "",
  containerClassName = "",
  variant = "default",
}) => {
  const Icon = type === "time" ? Clock : Calendar;
  const isBare = variant === "bare";

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
    if (el.disabled || el.readOnly || typeof el.showPicker !== "function") return;
    try {
      el.showPicker();
    } catch {
      /* Requiere gesto del usuario; si falla queda el comportamiento nativo. */
    }
  };

  return (
    <div className={twMerge("w-full", containerClassName)}>
      {label && (
        <Label htmlFor={id} className="mb-1.5">
          {label}
        </Label>
      )}

      <div className="relative">
        <input
          type={type}
          id={id}
          name={name}
          value={value ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          onClick={handleClick}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={twMerge(
            "field-datetime w-full min-w-0 text-base",
            isBare
              ? "h-11 border-0 bg-transparent p-0 pr-7 text-gray-700 shadow-none focus:outline-hidden focus:ring-0 dark:text-gray-200"
              : [
                  "h-11 rounded-lg border bg-transparent py-2.5 pl-4 pr-11 shadow-theme-xs",
                  "focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90",
                  disabled
                    ? "cursor-not-allowed border-gray-300 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    : error
                      ? "border-error-500 text-error-800 focus:ring-error-500/10 dark:border-error-500 dark:text-error-400"
                      : "border-gray-300 text-gray-800 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800",
                ].join(" "),
            className
          )}
        />

        {/* pointer-events-none para que el click atraviese el icono y llegue
            al boton nativo que cubre el campo. */}
        <span
          className={twMerge(
            "pointer-events-none absolute top-1/2 -translate-y-1/2",
            isBare ? "right-0" : "right-3",
            disabled ? "text-gray-300 dark:text-gray-600" : "text-gray-400 dark:text-gray-500"
          )}
          aria-hidden="true"
        >
          <Icon className={isBare ? "size-4" : "size-5"} />
        </span>
      </div>

      {hint && (
        <p className={twMerge("mt-1.5 text-xs", error ? "text-error-500" : "text-gray-500")}>
          {hint}
        </p>
      )}
    </div>
  );
};

export default DateField;

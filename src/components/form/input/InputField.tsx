import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/** Tipos que abren un selector nativo del sistema. */
const DATE_LIKE = ["date", "time", "datetime-local", "month", "week"];

/**
 * Abre el selector nativo al tocar el campo.
 *
 * En Chrome, Edge y Safari esto ya lo resuelve el CSS de `.field-datetime`
 * (globals.css), que estira el boton nativo para cubrir todo el input.
 * Firefox no expone ese pseudo-elemento, y ahi entra showPicker().
 *
 * showPicker() exige un gesto del usuario y lanza si el navegador no lo
 * soporta o el campo esta deshabilitado, por eso va dentro de un try.
 */
function openNativePicker(e: React.MouseEvent<HTMLInputElement>) {
  const el = e.currentTarget as HTMLInputElement & { showPicker?: () => void };
  if (el.disabled || el.readOnly || typeof el.showPicker !== "function") return;
  try {
    el.showPicker();
  } catch {
    /* Sin gesto de usuario o navegador sin soporte: se deja el comportamiento por defecto. */
  }
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
  onKeyDown,
}) => {
  const isDateLike = DATE_LIKE.includes(type);

  // `appearance-none` se omite en fecha/hora: en Safari iOS colapsa el campo.
  const base = isDateLike
    ? "field-datetime text-base h-11 w-full min-w-0 rounded-lg border px-4 py-2.5 shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
    : "text-base h-11 w-full rounded-lg border appearance-none px-4 py-2.5 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800";

  let inputClasses = `${base} ${className}`;

  // Add styles for the different states
  if (disabled) {
    inputClasses += ` text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    inputClasses += ` text-error-800 border-error-500 focus:ring-3 focus:ring-error-500/10  dark:text-error-400 dark:border-error-500`;
  } else if (success) {
    inputClasses += ` text-success-500 border-success-400 focus:ring-success-500/10 focus:border-success-300  dark:text-success-400 dark:border-success-500`;
  } else {
    inputClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={isDateLike ? openNativePicker : undefined}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${error
            ? "text-error-500"
            : success
              ? "text-success-500"
              : "text-gray-500"
            }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;

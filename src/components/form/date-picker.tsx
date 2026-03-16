import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id?: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: (date: string) => void;
  defaultDate?: DateOption;
  value?: string;
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  value,
  placeholder,
}: PropsType) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Transformamos visualmente "YYYY-MM-DD" a "DD/MM/YYYY" solo para la pantalla
  // (El split('T')[0] asegura que no se rompa si la BD te manda un formato con hora)
  const displayValue = value
    ? value.split('T')[0].split('-').reverse().join('/')
    : "";

  useEffect(() => {
    if (!inputRef.current) return;

    const flatPickr = flatpickr(inputRef.current, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      disableMobile: true,
      dateFormat: "d/m/Y", // Flatpickr usará internamente este formato
      defaultDate: displayValue || defaultDate,
      onChange: (selectedDates) => {
        if (onChange && selectedDates.length > 0) {
          // 2. Antes de enviarle la fecha a tu estado, la regresamos a "YYYY-MM-DD"
          const dbFormat = flatpickr.formatDate(selectedDates[0], "Y-m-d");
          onChange(dbFormat);
        }
      },
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, defaultDate]); // displayValue no va en las dependencias para evitar parpadeos

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          value={displayValue} // 3. Mostramos la fecha volteada
          readOnly
          placeholder={placeholder}
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
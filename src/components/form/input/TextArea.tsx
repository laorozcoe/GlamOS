import React from "react";

interface TextareaProps {
  name?: string; // 👈 1. Agregamos el name
  placeholder?: string;
  rows?: number;
  value?: string;
  // 👈 2. Cambiamos para que devuelva el evento completo, no solo un string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  hint?: string;
}

const TextArea: React.FC<TextareaProps> = ({
  name, // 👈 3. Lo extraemos aquí
  placeholder = "Enter your message",
  rows = 3,
  value = "",
  onChange,
  className = "",
  disabled = false,
  error = false,
  hint = "",
}) => {


  // Mismas medidas y colores que InputField: el area de texto se veia de otro
  // tono porque pintaba el texto en gray-400 -el gris de los placeholders- y
  // usaba text-sm mientras los inputs usan text-base.
  let textareaClasses = `w-full rounded-lg border px-4 py-2.5 text-base shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden dark:placeholder:text-white/30 ${className}`;

  if (disabled) {
    textareaClasses += ` bg-gray-100 opacity-50 text-gray-500 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700`;
  } else if (error) {
    textareaClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-error-300 focus:ring-3 focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-error-800`;
  } else {
    textareaClasses += ` bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800`;
  }

  return (
    <div className="relative">
      <textarea
        name={name} // 👈 5. Se lo pasamos al elemento HTML
        placeholder={placeholder}
        rows={rows}
        value={value}
        onChange={onChange} // 👈 6. Pasamos la función del padre directamente
        disabled={disabled}
        className={textareaClasses}
      />
      {hint && (
        <p
          className={`mt-2 text-sm ${error ? "text-error-500" : "text-gray-500 dark:text-gray-400"
            }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default TextArea;
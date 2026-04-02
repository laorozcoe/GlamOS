"use client";
import React, { useState, useEffect } from "react";

interface CountryCode {
  code: string;
  label: string;
}

// 👇 1. Creamos una interfaz para el valor que vamos a devolver
export interface PhoneValue {
  countryCode: string; // ej. "MX"
  phone: string;       // ej. "5550000000"
}

interface PhoneInputProps {
  countries: CountryCode[];
  placeholder?: string;
  // 👇 2. Cambiamos la firma de onChange
  onChange?: (value: PhoneValue) => void;
  selectPosition?: "start" | "end";
  // Opcional pero recomendado: recibir el valor inicial si estás editando un invitado
  value?: PhoneValue;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  countries,
  placeholder = "(555) 000-0000",
  onChange,
  selectPosition = "start",
  value,
}) => {
  // Inicializamos con los valores que nos pasan, o con valores por defecto
  const [selectedCountry, setSelectedCountry] = useState<string>(
    value?.countryCode || (countries.length > 0 ? countries[0].code : "MX")
  );
  const [localNumber, setLocalNumber] = useState<string>(value?.phone || "");

  // Si el valor externo cambia (ej. al cargar datos del backend), actualizamos
  useEffect(() => {
    if (value) {
      setSelectedCountry(value.countryCode);
      setLocalNumber(value.phone);
    }
  }, [value]);

  const countryCodes: Record<string, string> = countries.reduce(
    (acc, { code, label }) => ({ ...acc, [code]: label }),
    {}
  );

  const currentLada = countryCodes[selectedCountry] || "+52";

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    setSelectedCountry(newCountry);
    if (onChange) {
      // 👇 3. Enviamos el objeto con las dos piezas
      onChange({
        countryCode: newCountry,
        phone: localNumber,
      });
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d]/g, "").slice(0, 10);
    setLocalNumber(newNumber);
    if (onChange) {
      // 👇 4. Enviamos el objeto con las dos piezas
      onChange({
        countryCode: selectedCountry,
        phone: newNumber,
      });
    }
  };

  return (
    < div
      className="relative flex h-11 w-full overflow-hidden rounded-lg border border-gray-300 bg-transparent text-sm text-gray-800 shadow-theme-xs transition-colors focus-within:border-brand-300 focus-within:outline-hidden focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus-within:border-brand-800"
    >
      {/* --- INICIO: Dropdown a la izquierda --- */}
      {
        selectPosition === "start" && (
          <div className="relative flex items-center border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              className="appearance-none h-full w-full bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 cursor-pointer focus:outline-none dark:text-gray-400"
            >
              {countries.map((country) => (
                <option
                  key={country.code}
                  value={country.code}
                  className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
                >
                  {country.code}
                </option>
              ))}
            </select>
            {/* Ícono de flecha */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-700 dark:text-gray-400">
              <svg className="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )
      }

      {/* 4. Muestra la Lada como texto intocable (select-none previene que se resalte por accidente) */}
      <div className="flex items-center pl-3 pr-1 text-gray-500 dark:text-gray-400 font-medium select-none">
        {currentLada}
      </div>

      {/* 5. El input real donde teclea el usuario (sin bordes propios) */}
      <input
        type="tel"
        value={localNumber}
        onChange={handlePhoneNumberChange}
        maxLength={10} // <-- Agrega esta línea
        placeholder={placeholder}
        className="text-base flex-1 bg-transparent py-3 px-2 text-gray-800 placeholder:text-gray-400 focus:outline-none dark:text-white/90 dark:placeholder:text-white/30"
      />

      {/* --- FIN: Dropdown a la derecha --- */}
      {
        selectPosition === "end" && (
          <div className="relative flex items-center border-l border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              className="appearance-none h-full w-full bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 cursor-pointer focus:outline-none dark:text-gray-400"
            >
              {countries.map((country) => (
                <option
                  key={country.code}
                  value={country.code}
                  className="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
                >
                  {country.code}
                </option>
              ))}
            </select>
            {/* Ícono de flecha */}
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-700 dark:text-gray-400">
              <svg className="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default PhoneInput;
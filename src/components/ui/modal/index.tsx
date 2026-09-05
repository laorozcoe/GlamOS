"use client";
import React, { useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
  /**
   * Ancho máximo en pantallas anchas. Antes cada pantalla lo resolvía a mano
   * con `className="max-w-md"`, y había una docena de tamaños distintos.
   */
  size?: ModalSize;
}

const SIZES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  full: "sm:max-w-[95vw]",
};

let globalModalCount = 0;

/**
 * Diálogo modal.
 *
 * En pantalla angosta se comporta como HOJA INFERIOR: pegado abajo, a todo lo
 * ancho y con las esquinas superiores redondeadas. Es lo que corresponde en
 * celular -queda al alcance del pulgar en vez de en el centro de la pantalla-
 * y además evita el recorte que sufría la caja centrada cuando el contenido
 * era alto. A partir de `sm` vuelve a ser la caja centrada de siempre.
 *
 * El contenido tiene scroll propio y el panel está acotado a 92dvh, así que un
 * formulario largo scrollea dentro del modal y no empuja la página. Se usa dvh
 * y no vh porque en móvil la barra del navegador cambia de alto.
 *
 * `className` sigue ganando sobre `size` (via twMerge), de modo que las
 * pantallas que ya pasaban su propio `max-w-*` no cambian.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
  size = "lg",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      // Se cuentan los modales abiertos: cerrar uno anidado no debe devolver
      // el scroll al body mientras el de abajo sigue abierto.
      if (globalModalCount === 0) {
        document.body.style.overflow = "hidden";
      }
      globalModalCount++;

      return () => {
        globalModalCount--;
        if (globalModalCount === 0) {
          document.body.style.overflow = "unset";
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const panelClasses = isFullscreen
    ? "w-full h-full"
    : twMerge(
        "relative flex w-full flex-col bg-white dark:bg-gray-900",
        // Hoja inferior en angosto, caja centrada desde sm.
        "max-h-[92dvh] rounded-t-3xl sm:w-11/12 sm:rounded-3xl",
        SIZES[size]
      );

  return (
    <div
      className={twMerge(
        "modal fixed inset-0 z-99999 flex justify-center overflow-hidden",
        // items-end = pegado abajo (hoja); desde sm, centrado.
        isFullscreen ? "items-center" : "items-end sm:items-center"
      )}
    >
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
          onClick={onClose}
        ></div>
      )}
      <div
        ref={modalRef}
        className={twMerge(panelClasses, className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-999 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z" fill="currentColor" />
            </svg>
          </button>
        )}
        {/* El contenido scrollea dentro del panel, no la página. */}
        <div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};

"use client";
import React, { useRef, useEffect } from "react";
import { twMerge } from "tailwind-merge";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";
type MobileVariant = "centered" | "fullscreen";

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
  /**
   * Cómo se comporta en pantalla angosta:
   *
   * - `centered` (por defecto): caja centrada con margen, igual que en
   *   escritorio. Para confirmaciones y formularios cortos.
   * - `fullscreen`: ocupa toda la pantalla. Para flujos completos -crear una
   *   cita, buscar productos-, donde la franja de arriba solo desperdicia
   *   espacio en un celular.
   */
  mobileVariant?: MobileVariant;
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
 * Por defecto es una caja centrada en cualquier tamaño de pantalla, con
 * margen lateral en celular. `mobileVariant="fullscreen"` la convierte en
 * pantalla completa por debajo de `sm`, para los flujos largos.
 *
 * El contenido tiene scroll propio y el panel está acotado a 92svh, así que un
 * formulario largo scrollea dentro del modal y no empuja la página.
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
  mobileVariant = "centered",
}) => {
  const esPantallaCompleta = mobileVariant === "fullscreen";
  // Muchas pantallas ya resolvian el ancho a mano con un `max-w-*` sin prefijo
  // en `className`. twMerge NO puede deduplicar eso contra el `sm:max-w-*` de
  // SIZES -son variantes distintas-, asi que los dos sobrevivian y desde `sm`
  // ganaba el de SIZES, dejando en `lg` a modales declarados `max-w-5xl`.
  // Si la pantalla trae su propio ancho, `size` no aporta nada.
  const traeAnchoPropio = /(?:^|[\s:])max-w-/.test(className ?? "");
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
        // Se mide en `svh` y no en `dvh` ni `vh`: `svh` es el alto del viewport
        // CON la barra del navegador visible, o sea el más pequeño. Con `dvh`
        // el panel se redimensiona al aparecer y desaparecer esa barra, y con
        // `vh` el último botón queda debajo del borde.
        esPantallaCompleta
          ? "h-svh max-h-svh rounded-none sm:h-auto sm:max-h-[92svh] sm:rounded-3xl"
          : "max-h-[92svh] rounded-3xl",
        "sm:w-11/12",
        traeAnchoPropio ? "" : SIZES[size]
      );

  return (
    <div
      className={twMerge(
        "modal fixed inset-0 z-99999 flex justify-center overflow-hidden",
        // El padding del contenedor -y no un margen en el panel- es lo que
        // separa la caja del borde en celular: así el ancho sigue siendo
        // `w-full` y no hay que restarle el margen.
        isFullscreen
          ? "items-center"
          : esPantallaCompleta
            ? "items-stretch sm:items-center"
            : "items-center p-4 sm:p-0"
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
        {/* El contenido scrollea dentro del panel, no la página. El padding
            inferior deja libre la zona del indicador de inicio del iPhone, que
            si no se come el último botón. */}
        <div className="flex h-full w-full flex-col overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// components/booking/ServiceModal.tsx
import React from 'react';
import { Modal } from "@/components/ui/modal";
import { ServiceSelector } from '@/components/calendar/mobile/ServiceSelector'; // Importamos el componente de arriba

export const ServiceModal = ({ isOpen, onClose, ...selectorProps }: any) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            // Z-index alto para ponerse encima del otro modal
            className="w-full h-[90svh] md:h-[80vh] md:max-w-2xl bg-white dark:bg-gray-900 md:rounded-2xl shadow-2xl flex flex-col z-50"
        >
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-800">
                <h3 className="font-bold text-lg dark:text-white">Agregar Servicios</h3>
            </div>

            <div className="flex-1 p-4 overflow-hidden">
                <ServiceSelector {...selectorProps} />
            </div>
            <div className="p-4 bg-white border-t border-gray-200 shadow-sm safe-area-pb">

                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black">
                        Aceptar
                    </button>

                </div>
            </div>
        </Modal>
    );
};
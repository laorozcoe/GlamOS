import React from "react";
import { Modal } from "@/components/ui/modal";

interface SaleDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: any; // El evento seleccionado con toda la info
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
    isOpen, onClose, event
}) => {
    if (!event) return null;

    // Extraer datos del evento (ExtendedProps de FullCalendar)
    const {
        guestName, guestPhone, paymentStatus, services, totalAmount, notes
        // } = event.extendedProps;
    } = event;

    const employeeName = event.employee?.user?.name || "Sin asignar";
    // const employeeName = event.extendedProps.employee?.user?.name || "Sin asignar";

    // Formatear Fecha
    const dateStr = event.start?.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = event.start?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            showCloseButton={true}
        >
            {/* HEADER TIPO TICKET */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 border-b border-gray-100 dark:border-gray-700 text-center relative">
                <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-2 border border-green-200">
                    ✅ {paymentStatus}
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                    ${totalAmount}
                </h3>
                <p className="text-gray-500 text-sm mt-1">Total Pagado</p>
            </div>

            {/* BODY CON DETALLES */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">

                {/* Cliente y Empleado */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-400 font-bold text-xs uppercase">Cliente</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{guestName || "Público General"}</p>
                        <p className="text-xs text-gray-500">{guestPhone}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 font-bold text-xs uppercase">Atendió</p>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{employeeName}</p>
                    </div>
                </div>

                <hr className="border-dashed border-gray-200" />

                {/* Lista de Servicios (Ticket) */}
                <div>
                    <p className="text-gray-400 font-bold text-xs uppercase mb-3">Resumen de Servicios</p>
                    <div className="space-y-3">
                        {services?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                    {item.service?.name || "Servicio"}
                                </span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                    ${item.price}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className="border-dashed border-gray-200" />

                {/* Fecha y Notas */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Fecha:</span>
                        <span className="font-medium">{dateStr}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Hora:</span>
                        <span className="font-medium">{timeStr}</span>
                    </div>
                    {notes && (
                        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 mb-1">Notas de Pago:</p>
                            <p className="font-medium italic text-gray-600">{notes}</p>
                        </div>
                    )}
                </div>

            </div>

            {/* FOOTER ACCIONES */}
            <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Cerrar
                </button>
                {/* Aquí podrías agregar un botón de Imprimir en el futuro */}
                <button
                    onClick={() => alert("Imprimiendo ticket...")}
                    className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex justify-center gap-2"
                >
                    <span>🖨️</span> Imprimir
                </button>
            </div>
        </Modal>
    );
};
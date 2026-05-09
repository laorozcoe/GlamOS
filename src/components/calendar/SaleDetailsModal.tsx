import React from "react";
import { Modal } from "@/components/ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";

interface SaleDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: any; // El evento seleccionado con toda la info
    onReprint: () => void;
    sale?: any; // Datos de la venta (SaleItem con couponCovered, etc.)
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
    isOpen, onClose, event, onReprint, sale
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
            className="w-[95svw] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            showCloseButton={true}
        >
            {/* HEADER TIPO TICKET */}
            <div className="bg-gray-50 dark:bg-gray-800 p-6 border-b border-gray-100 dark:border-gray-700 text-center relative">
                <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold mb-2 border border-green-200">
                    ✅ {paymentStatus}
                </div>
                <Label className="text-2xl font-black text-gray-900 dark:text-white">
                    ${totalAmount}
                </Label>
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

                {/* Cupón aplicado */}
                {sale?.coupon && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-sm">
                        <span>🎟</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                            {sale.coupon.category === "COURTESY" ? "Cortesía" : "Cupón"}: {sale.coupon.code}
                        </span>
                        {sale.discount > 0 && (
                            <span className="ml-auto font-bold text-purple-600 dark:text-purple-400">
                                -${Number(sale.discount).toLocaleString()}
                            </span>
                        )}
                    </div>
                )}

                {/* Lista de Servicios (Ticket) */}
                <div>
                    <p className="text-gray-400 font-bold text-xs uppercase mb-3">Resumen de Servicios</p>
                    <div className="space-y-3">
                        {services?.map((item: any, idx: number) => {
                            const saleItem = sale?.items?.find((si: any) => si.serviceId === item.serviceId);
                            const covered = saleItem?.couponCovered ?? false;
                            return (
                                <div key={idx} className="flex justify-between items-center text-sm gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-gray-700 dark:text-gray-300 truncate">
                                            {item.service?.name || "Servicio"}
                                        </span>
                                        {covered && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-700">
                                                Cortesía
                                            </span>
                                        )}
                                    </div>
                                    <span className={`font-bold shrink-0 ${covered ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>
                                        {covered ? (
                                            <>
                                                <span className="line-through text-gray-400 text-xs mr-1">${item.price}</span>
                                                $0
                                            </>
                                        ) : `$${item.price}`}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <hr className="border-dashed border-gray-200" />

                {/* Total */}
                {sale && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-sm space-y-1.5">
                        {sale.discount > 0 && (
                            <>
                                <div className="flex justify-between text-gray-500">
                                    <span>Subtotal</span>
                                    <span>${Number(sale.subtotal).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <span>Descuento</span>
                                    <span>-${Number(sale.discount).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between font-black text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                            <span>Total pagado</span>
                            <span>${Number(sale.total).toLocaleString()}</span>
                        </div>
                    </div>
                )}

                {/* Fecha y Notas */}
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between">
                        <Label className="text-gray-500">Fecha:</Label>
                        <Label color="text-brand-500 dark:text-brand-400" className="font-medium">{dateStr}</Label>
                    </div>
                    <div className="flex justify-between">
                        <Label className="text-gray-500">Hora:</Label>
                        <Label color="text-brand-500 dark:text-brand-400" className="font-medium">{timeStr}</Label>
                    </div>
                    {notes && (
                        <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                            <Label className="text-gray-500 mb-1">Notas de Pago:</Label>
                            <Label color="text-brand-500 dark:text-brand-400" className="font-medium italic text-gray-600">{notes}</Label>
                        </div>
                    )}
                </div>

            </div>

            {/* FOOTER ACCIONES */}
            <div className="p-5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3">
                <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Cerrar
                </Button>
                {/* Aquí podrías agregar un botón de Imprimir en el futuro */}
                <Button
                    onClick={onReprint}
                    className="flex-1 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex justify-center gap-2"
                >
                    <span>🖨️</span> Imprimir
                </Button>
            </div>
        </Modal>
    );
};
// import PageBreadcrumb from "@/components/common/PageBreadCrumb";
// import { Metadata } from "next";
// import React from "react";

// export default function BlankPage() {
//     return (
//         <div>
//             <PageBreadcrumb pageTitle="Ventas" />
//             <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
//                 <div className="mx-auto w-full max-w-[630px] text-center">
//                     <h3 className="mb-4 font-semibold text-gray-800 text-theme-xl dark:text-white/90 sm:text-2xl">
//                         Card Title Here
//                     </h3>
//                     <p className="text-sm text-gray-500 dark:text-gray-400 sm:text-base">
//                         Start putting content on grids or panels, you can also use different
//                         combinations of grids.Please check out the dashboard and other pages
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }


"use client";
import React, { useState } from "react";
import { usePrinter } from "@/hooks/usePrinter";
import { PrinterStatus } from "@/components/Print/PrinterStatus";
import { useBusiness } from "@/context/BusinessContext";

export default function QuickSalePage() {
    const { business } = useBusiness();
    const { status, connect, printTicket } = usePrinter();

    // ESTADOS (Los mismos que usabas en el modal)
    const [selectedItems, setSelectedItems] = useState([]);
    const [customer, setCustomer] = useState({ name: "", phone: "" });
    const [paymentData, setPaymentData] = useState({ method: "CASH", received: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    // Cálculos dinámicos
    const subtotal = selectedItems.reduce((acc, item) => acc + item.price, 0);
    const change = paymentData.received > subtotal ? paymentData.received - subtotal : 0;

    const handleFinalize = async () => {
        // setIsProcessing(true);
        // // Aquí invocas tu lógica de handleFinalizePayment que ya tenemos
        // // ... (Transacción de Prisma + printTicket)
        // setIsProcessing(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header con el semáforo de la impresora */}


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* COLUMNA IZQUIERDA: Selección de Servicios y Cliente */}
                <div className="lg:col-span-2 space-y-6">

                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Venta Rápida (Sin Cita)</h1>
                            <p className="text-gray-500 text-sm">Registra servicios directos de mostrador</p>
                        </div>
                    </div>
                    {/* Datos del Cliente */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h2 className="font-semibold mb-4 flex items-center gap-2">
                            <span className="w-2 h-5 bg-brand-500 rounded-full inline-block"></span>
                            Información del Cliente
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                placeholder="Nombre (opcional)"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 ring-brand-500/20"
                            // value={customer.name}
                            // onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                            />
                            <input
                                placeholder="Teléfono"
                                className="w-full p-2.5 border rounded-lg focus:ring-2 ring-brand-500/20"
                            // value={customer.phone}
                            // onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Selector de Servicios (Aquí podrías mapear tus servicios de la BD) */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
                        <h2 className="font-semibold mb-4 text-gray-800">Seleccionar Servicios</h2>
                        {/* Aquí va tu lista de servicios con botón (+) */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Ejemplo de botón de servicio */}
                            <button
                                // onClick={() => setSelectedItems([...selectedItems, { id: '1', name: 'Manicure', price: 250 }])}
                                className="p-4 border rounded-xl hover:bg-gray-50 text-left transition-all active:scale-95"
                            >
                                <span className="block font-medium">Manicure</span>
                                <span className="text-brand-600 font-bold">$250</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Resumen y Pago */}
                <div className="lg:col-span-1">
                    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl sticky top-6">
                        <h2 className="text-lg font-bold mb-6 border-b border-white/10 pb-4">Resumen de Venta</h2>

                        <div className="space-y-4 mb-8 max-h-[200px] overflow-y-auto pr-2">
                            {selectedItems.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{item.name}</span>
                                    <span>${item.price.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-white/10 pt-4 space-y-2">
                            <div className="flex justify-between text-xl font-bold">
                                <span>TOTAL</span>
                                <span className="text-green-400">${subtotal.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Métodos de Pago */}
                        <div className="mt-8 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setPaymentData({ ...paymentData, method: 'CASH' })}
                                className={`p-3 rounded-lg border ${paymentData.method === 'CASH' ? 'bg-white text-black' : 'border-white/20 text-white'}`}
                            >
                                Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentData({ ...paymentData, method: 'CARD' })}
                                className={`p-3 rounded-lg border ${paymentData.method === 'CARD' ? 'bg-white text-black' : 'border-white/20 text-white'}`}
                            >
                                Tarjeta
                            </button>
                        </div>

                        {paymentData.method === 'CASH' && (
                            <div className="mt-4 space-y-2">
                                <label className="text-xs text-gray-400 uppercase">Efectivo Recibido</label>
                                <input
                                    type="number"
                                    className="w-full bg-white/10 border-none rounded-lg p-3 text-white text-2xl font-bold focus:ring-2 ring-green-500"
                                    value={paymentData.received}
                                    onChange={(e) => setPaymentData({ ...paymentData, received: parseFloat(e.target.value) })}
                                />
                                <div className="flex justify-between text-sm pt-2">
                                    <span className="text-gray-400">Cambio:</span>
                                    <span className="text-green-400 font-bold">${change.toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleFinalize}
                            disabled={subtotal === 0 || isProcessing}
                            className="w-full mt-8 bg-green-500 hover:bg-green-600 disabled:bg-gray-700 text-white font-bold py-4 rounded-xl transition-colors flex justify-center items-center gap-2"
                        >
                            {isProcessing ? "Procesando..." : "CONFIRMAR Y PAGAR"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
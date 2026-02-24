import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onFinalize: (paymentData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen, onClose, total, onFinalize
}) => {
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [amountReceived, setAmountReceived] = useState<string>('');

    const changeAmount = amountReceived ? Math.max(0, Number(amountReceived) - total) : 0;
    const isConfirmDisabled = paymentMethod === 'CASH' && Number(amountReceived) < total;

    const handleConfirm = () => {
        onFinalize({
            method: paymentMethod,
            received: paymentMethod === 'CASH' ? Number(amountReceived) : total,
            change: changeAmount,
            total: total
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[95svw] h-[95svh] bg-white rounded-2xl shadow-2xl overflow-hidden p-0"
            showCloseButton={true}
        >
            <div className="flex flex-col h-full">
                {/* Header Total */}
                <div className="bg-gray-50 p-6 border-b text-center">
                    <h3 className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1">Total a Pagar</h3>
                    <div className="text-5xl font-black text-gray-900 tracking-tight">${total}</div>
                </div>

                <div className="p-6 space-y-6">
                    {/* Métodos */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod('CASH')}
                                className={`py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                  ${paymentMethod === 'CASH' ? 'border-black bg-black text-white' : 'border-gray-200 text-gray-600'}`}
                            >
                                <span>💵</span> Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('TRANSFER')}
                                className={`py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                  ${paymentMethod === 'TRANSFER' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600'}`}
                            >
                                <span>💳</span> Transferencia
                            </button>
                        </div>
                    </div>

                    {/* Input Efectivo */}
                    {paymentMethod === 'CASH' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Recibido</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        autoFocus
                                        value={amountReceived}
                                        onChange={(e) => setAmountReceived(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-black outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl flex justify-between items-center ${changeAmount < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                <span className="font-bold text-sm uppercase">Cambio</span>
                                <span className="text-2xl font-black">${changeAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {paymentMethod === 'CARD' && (
                        <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-center text-sm font-medium">
                            Usa la terminal bancaria para procesar el cobro.
                        </div>
                    )}
                </div>

                {/* Botones */}
                <div className="p-6 border-t mt-auto bg-gray-50 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all
                ${isConfirmDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 hover:scale-[1.02]'}
            `}
                    >
                        Confirmar Pago
                    </button>
                </div>
            </div>
        </Modal>
    );
};
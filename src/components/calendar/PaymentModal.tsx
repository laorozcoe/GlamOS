import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import InputField from "../form/input/InputField";
import { Trash } from "lucide-react";

interface PaymentItem {
    method: 'CASH' | 'CARD' | 'TRANSFER';
    amount: number;
    received: number;
    change: number;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onFinalize: (paymentData: any) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen, onClose, total, onFinalize
}) => {
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [amountReceived, setAmountReceived] = useState<string>('');

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            setAmountReceived('');
            setPaymentMethod('CASH');
        }
    }, [isOpen, total]);

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const balanceRemaining = Math.max(0, total - totalPaid);

    // Default amount for CARD or TRANSFER is the remaining balance
    useEffect(() => {
        if (paymentMethod !== 'CASH' && amountReceived === '') {
            setAmountReceived(balanceRemaining > 0 ? balanceRemaining.toString() : '');
        }
        if (paymentMethod === 'CASH' && Number(amountReceived) === balanceRemaining) {
            setAmountReceived(''); // Clear default for cash so they can type what they receive
        }
    }, [paymentMethod, balanceRemaining]);

    const changeAmountDynamic = paymentMethod === 'CASH' && amountReceived ? Math.max(0, Number(amountReceived) - balanceRemaining) : 0;
    const canAddPayment = Number(amountReceived) > 0 && balanceRemaining > 0;

    const handleAddPayment = () => {
        const receivedNum = Number(amountReceived);
        if (isNaN(receivedNum) || receivedNum <= 0) return;

        let appliedAmount = 0;
        let changeAmount = 0;

        if (paymentMethod === 'CASH') {
             appliedAmount = Math.min(receivedNum, balanceRemaining);
             changeAmount = receivedNum > balanceRemaining ? receivedNum - balanceRemaining : 0;
        } else {
             // For cards & transfers, we don't return change, they just pay exactly the balance or a partial amount
             appliedAmount = Math.min(receivedNum, balanceRemaining);
             changeAmount = 0;
        }

        const newPayment: PaymentItem = {
            method: paymentMethod,
            amount: appliedAmount,
            received: receivedNum,
            change: changeAmount
        };

        setPayments([...payments, newPayment]);
        setAmountReceived('');
        // Suggest cash next if still owes money
        setPaymentMethod('CASH');
    };

    const handleRemovePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const isConfirmDisabled = totalPaid < total;

    const handleConfirm = () => {
        if (isConfirmDisabled) return;

        // Provide an array of payments natively
        onFinalize({
            isSplitPayment: true,
            payments: payments,
            totalRequested: total,
            totalProcessed: totalPaid
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[95svw] max-w-lg rounded-2xl shadow-2xl overflow-hidden p-0 bg-white dark:bg-gray-900"
            showCloseButton={true}
        >
            <div className="flex flex-col h-full max-h-[90svh] overflow-y-auto custom-scrollbar">
                {/* Header Total */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/30">
                    <Label className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1 block">Total a Pagar</Label>
                    <Label className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">${total.toLocaleString()}</Label>
                </div>

                <div className="p-6 space-y-6">
                    {/* Pagos Realizados */}
                    {payments.length > 0 && (
                        <div className="space-y-3">
                            <Label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Pagos Agregados</Label>
                            <div className="space-y-2">
                                {payments.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">
                                                {p.method === 'CASH' ? '💵' : p.method === 'CARD' ? '💳' : '🏦'}
                                            </span>
                                            <div>
                                                <p className="text-sm font-bold dark:text-white">
                                                    {p.method === 'CASH' ? 'Efectivo' : p.method === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                                                </p>
                                                {p.change > 0 && (
                                                    <p className="text-xs text-brand-500">Recibido: ${p.received} (Cambio: ${p.change})</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-black text-gray-900 dark:text-white">${p.amount.toLocaleString()}</span>
                                            <button onClick={() => handleRemovePayment(idx)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {balanceRemaining > 0 ? (
                                <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-500/30 text-center">
                                    <Label className="text-orange-700 dark:text-orange-400 font-bold block mb-1">Restante por Pagar</Label>
                                    <Label className="text-2xl font-black text-orange-800 dark:text-orange-500">${balanceRemaining.toLocaleString()}</Label>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-500/30 text-center flex items-center justify-center gap-2 text-green-700 dark:text-green-500">
                                    <span className="text-2xl font-black">✅ Total Cubierto</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Controles para AGREGAR un pago si aún hay saldo pendiente */}
                    {balanceRemaining > 0 && (
                        <div className="space-y-6 pt-2 border-t border-gray-100 dark:border-gray-800 mt-6">
                            <div>
                                <Label className="block text-sm font-bold mb-3 dark:text-white">Selecciona Método</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('CASH')}
                                        className={`py-3 px-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                                        ${paymentMethod === 'CASH' ? 'border-black bg-black text-white dark:border-white dark:bg-brand-500' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}
                                    >
                                        <span>💵</span> Efectivo
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('CARD')}
                                        className={`py-3 px-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                                        ${paymentMethod === 'CARD' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}
                                    ><span>💳</span> Tarjeta</button>
                                    <button
                                        onClick={() => setPaymentMethod('TRANSFER')}
                                        className={`py-3 px-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                                        ${paymentMethod === 'TRANSFER' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}
                                    >
                                        <span>🏦</span> Transfe.
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        {paymentMethod === 'CASH' ? 'Cantidad Recibida' : 'Cantidad a Cobrar'}
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                        <InputField
                                            type="number"
                                            value={amountReceived}
                                            onChange={(e) => setAmountReceived(e.target.value)}
                                            className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-black dark:focus:border-white outline-none dark:bg-gray-800 dark:text-white"
                                            placeholder="0.00"
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') handleAddPayment();
                                            }}
                                        />
                                    </div>
                                </div>

                                {paymentMethod === 'CASH' && amountReceived && changeAmountDynamic > 0 && (
                                    <div className="p-4 rounded-xl flex justify-between items-center bg-green-50 dark:bg-green-900/30">
                                        <Label color="text-green-700 dark:text-green-400" className="font-bold text-sm uppercase">Cambio a entregar</Label>
                                        <Label color="text-green-700 dark:text-green-400" className="text-2xl font-black">${changeAmountDynamic.toLocaleString()}</Label>
                                    </div>
                                )}

                                {paymentMethod === 'CARD' && (
                                    <div className="p-4 bg-blue-50 text-blue-800 dark:text-blue-200 dark:bg-blue-900/30 rounded-xl text-center text-sm font-medium">
                                        Usa la terminal bancaria para procesar el cobro de ${amountReceived || balanceRemaining}.
                                    </div>
                                )}

                                <Button 
                                    onClick={handleAddPayment} 
                                    className="w-full py-3" 
                                    variant="outline" 
                                    disabled={!canAddPayment}
                                >
                                    Agregar Pago
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Botones */}
                <div className="p-6 border-t border-gray-100 dark:border-gray-800 mt-auto bg-gray-50/50 dark:bg-gray-800/30 flex gap-3">
                    <Button onClick={onClose} variant="outline" className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isConfirmDisabled}
                        className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all
                        ${isConfirmDisabled ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-black hover:bg-gray-800 hover:scale-[1.02]'}`}
                    >
                        Confirmar Pago
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
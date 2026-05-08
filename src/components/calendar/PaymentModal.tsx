import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import InputField from "../form/input/InputField";
import { Trash, Search, QrCode, X, Tag, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { validateCoupon } from "@/app/(admin)/(others-pages)/coupons/actions";
import { QRScannerModal } from "./QRScannerModal";
import { CouponSearchModal } from "./CouponSearchModal";

interface PaymentItem {
    method: 'CASH' | 'CARD' | 'TRANSFER';
    amount: number;
    received: number;
    change: number;
}

interface AppliedCoupon {
    id: string;
    code: string;
    name: string;
    type: string;
    value: number;
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
    // ---- Pagos ----
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [amountReceived, setAmountReceived] = useState<string>('');

    // ---- Cupón ----
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [tokenId, setTokenId] = useState<string | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // Reset completo al abrir
    useEffect(() => {
        if (isOpen) {
            setPayments([]);
            setAmountReceived('');
            setPaymentMethod('CASH');
            setCouponInput('');
            setAppliedCoupon(null);
            setDiscountAmount(0);
            setTokenId(null);
            setCouponError(null);
        }
    }, [isOpen]);

    // ---- Cálculos ----
    const effectiveTotal = Math.max(0, total - discountAmount);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const balanceRemaining = Math.max(0, effectiveTotal - totalPaid);

    useEffect(() => {
        if (paymentMethod !== 'CASH' && amountReceived === '') {
            setAmountReceived(balanceRemaining > 0 ? balanceRemaining.toString() : '');
        }
        if (paymentMethod === 'CASH' && Number(amountReceived) === balanceRemaining) {
            setAmountReceived('');
        }
    }, [paymentMethod, balanceRemaining]);

    const changeAmountDynamic =
        paymentMethod === 'CASH' && amountReceived
            ? Math.max(0, Number(amountReceived) - balanceRemaining)
            : 0;
    const canAddPayment = Number(amountReceived) > 0 && balanceRemaining > 0;

    // ---- Cupón handlers ----
    const applyCoupon = async (code: string) => {
        const trimmed = code.trim().toUpperCase();
        if (!trimmed) return;
        setCouponLoading(true);
        setCouponError(null);
        try {
            const result = await validateCoupon(trimmed, total);
            if (!result.valid) {
                setCouponError(result.error);
                return;
            }
            setAppliedCoupon(result.coupon);
            setDiscountAmount(result.discount);
            setTokenId(result.tokenId ?? null);
            setCouponInput(result.coupon.code);
            setPayments([]); // Reiniciar pagos al cambiar el monto
        } catch {
            setCouponError('Error al validar el cupón');
        } finally {
            setCouponLoading(false);
        }
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setTokenId(null);
        setCouponInput('');
        setCouponError(null);
        setPayments([]);
    };

    // ---- Payment handlers ----
    const handleAddPayment = () => {
        const receivedNum = Number(amountReceived);
        if (isNaN(receivedNum) || receivedNum <= 0) return;

        const appliedAmount = Math.min(receivedNum, balanceRemaining);
        const changeAmount = paymentMethod === 'CASH' && receivedNum > balanceRemaining
            ? receivedNum - balanceRemaining
            : 0;

        setPayments([...payments, {
            method: paymentMethod,
            amount: appliedAmount,
            received: receivedNum,
            change: changeAmount,
        }]);
        setAmountReceived('');
        setPaymentMethod('CASH');
    };

    const handleRemovePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const isConfirmDisabled = totalPaid < effectiveTotal;

    const handleConfirm = () => {
        if (isConfirmDisabled) return;
        onFinalize({
            isSplitPayment: true,
            payments,
            totalRequested: effectiveTotal,
            totalProcessed: totalPaid,
            couponId: appliedCoupon?.id || null,
            couponCode: appliedCoupon?.code || null,
            tokenId: tokenId,
            discountAmount,
            originalTotal: total,
        });
    };

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                className="w-[95svw] max-w-lg rounded-2xl shadow-2xl overflow-hidden p-0 bg-white dark:bg-gray-900"
                showCloseButton={true}
            >
                <div className="flex flex-col h-full max-h-[90svh] overflow-y-auto custom-scrollbar">

                    {/* ── Header Total ── */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/30">
                        {appliedCoupon ? (
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                                    ${total.toLocaleString()}
                                </span>
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                    {appliedCoupon.type === 'PERCENTAGE'
                                        ? `${appliedCoupon.value}% off`
                                        : 'Descuento fijo'} — ahorras ${discountAmount.toLocaleString()}
                                </span>
                                <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
                                    ${effectiveTotal.toLocaleString()}
                                </span>
                            </div>
                        ) : (
                            <>
                                <Label className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1 block">
                                    Total a Pagar
                                </Label>
                                <Label className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                                    ${total.toLocaleString()}
                                </Label>
                            </>
                        )}
                    </div>

                    <div className="p-6 space-y-5">

                        {/* ── Sección Cupón ── */}
                        <div className="space-y-2">
                            <Label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Cupón de descuento
                            </Label>

                            {appliedCoupon ? (
                                /* Cupón aplicado */
                                <div className="flex items-center justify-between p-3 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-green-800 dark:text-green-300">
                                                {appliedCoupon.code}
                                            </p>
                                            <p className="text-xs text-green-600 dark:text-green-400">
                                                {appliedCoupon.name} · -${discountAmount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={removeCoupon}
                                        className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-400 transition-colors"
                                        title="Quitar cupón"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                /* Input + botones */
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        {/* Input código */}
                                        <div className="relative flex-1">
                                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                value={couponInput}
                                                onChange={(e) => {
                                                    setCouponInput(e.target.value.toUpperCase());
                                                    setCouponError(null);
                                                }}
                                                onKeyDown={(e) => e.key === 'Enter' && applyCoupon(couponInput)}
                                                placeholder="Código del cupón"
                                                className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Aplicar */}
                                        <button
                                            onClick={() => applyCoupon(couponInput)}
                                            disabled={couponLoading || !couponInput.trim()}
                                            className="px-3 py-2.5 text-sm font-semibold rounded-xl border-2 border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
                                        >
                                            {couponLoading
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : 'Aplicar'}
                                        </button>

                                        {/* Buscar */}
                                        <button
                                            onClick={() => setShowSearch(true)}
                                            className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                                            title="Buscar cupón activo"
                                        >
                                            <Search className="w-4 h-4" />
                                        </button>

                                        {/* QR */}
                                        <button
                                            onClick={() => setShowQR(true)}
                                            className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                                            title="Escanear código QR"
                                        >
                                            <QrCode className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Error de validación */}
                                    {couponError && (
                                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                            {couponError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Pagos Realizados ── */}
                        {payments.length > 0 && (
                            <div className="space-y-3">
                                <Label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    Pagos Agregados
                                </Label>
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
                                                        <p className="text-xs text-brand-500">
                                                            Recibido: ${p.received} (Cambio: ${p.change})
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-gray-900 dark:text-white">
                                                    ${p.amount.toLocaleString()}
                                                </span>
                                                <button
                                                    onClick={() => handleRemovePayment(idx)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {balanceRemaining > 0 ? (
                                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 dark:bg-orange-900/20 dark:border-orange-500/30 text-center">
                                        <Label className="text-orange-700 dark:text-orange-400 font-bold block mb-1">
                                            Restante por Pagar
                                        </Label>
                                        <Label className="text-2xl font-black text-orange-800 dark:text-orange-500">
                                            ${balanceRemaining.toLocaleString()}
                                        </Label>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-500/30 text-center">
                                        <span className="text-2xl font-black text-green-700 dark:text-green-500">
                                            ✅ Total Cubierto
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Agregar pago ── */}
                        {balanceRemaining > 0 && (
                            <div className="space-y-6 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <div>
                                    <Label className="block text-sm font-bold mb-3 dark:text-white">
                                        Selecciona Método
                                    </Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['CASH', 'CARD', 'TRANSFER'] as const).map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => setPaymentMethod(m)}
                                                className={`py-3 px-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all text-sm
                                                ${paymentMethod === m
                                                    ? m === 'CASH'
                                                        ? 'border-black bg-black text-white dark:border-white dark:bg-brand-500'
                                                        : 'border-blue-600 bg-blue-600 text-white'
                                                    : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}`}
                                            >
                                                <span>{m === 'CASH' ? '💵' : m === 'CARD' ? '💳' : '🏦'}</span>
                                                {m === 'CASH' ? 'Efectivo' : m === 'CARD' ? 'Tarjeta' : 'Transfe.'}
                                            </button>
                                        ))}
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
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddPayment(); }}
                                            />
                                        </div>
                                    </div>

                                    {paymentMethod === 'CASH' && amountReceived && changeAmountDynamic > 0 && (
                                        <div className="p-4 rounded-xl flex justify-between items-center bg-green-50 dark:bg-green-900/30">
                                            <Label color="text-green-700 dark:text-green-400" className="font-bold text-sm uppercase">
                                                Cambio a entregar
                                            </Label>
                                            <Label color="text-green-700 dark:text-green-400" className="text-2xl font-black">
                                                ${changeAmountDynamic.toLocaleString()}
                                            </Label>
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

                    {/* ── Footer ── */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 mt-auto bg-gray-50/50 dark:bg-gray-800/30 flex gap-3">
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={isConfirmDisabled}
                            className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all
                            ${isConfirmDisabled
                                ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed'
                                : 'bg-black hover:bg-gray-800 hover:scale-[1.02]'}`}
                        >
                            Confirmar Pago
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Sub-modales */}
            <QRScannerModal
                isOpen={showQR}
                onClose={() => setShowQR(false)}
                onDetect={(code) => {
                    setCouponInput(code);
                    applyCoupon(code);
                }}
            />
            <CouponSearchModal
                isOpen={showSearch}
                onClose={() => setShowSearch(false)}
                onSelect={(code) => applyCoupon(code)}
                subtotal={total}
            />
        </>
    );
};

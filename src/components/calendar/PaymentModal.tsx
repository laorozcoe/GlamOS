import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import InputField from "../form/input/InputField";
import { Trash, Search, QrCode, X, Tag, CheckCircle, AlertCircle, Loader2, Terminal, XCircle, Sparkles, CreditCard, AlertTriangle } from "lucide-react";
import { validateCoupon } from "@/app/(admin)/(others-pages)/coupons/actions";
import { getActiveTerminals, checkTerminalsStatus, changeMpDeviceMode } from "@/app/(admin)/(others-pages)/settings/actions";
import { getActivePromotions } from "@/app/(admin)/(others-pages)/promotions/actions";
import { applyPromotions, PromotionResult } from "@/lib/applyPromotions";
import { QRScannerModal } from "./QRScannerModal";
import { CouponSearchModal } from "./CouponSearchModal";
import { useBusiness } from "@/context/BusinessContext";
import { toast } from "react-toastify";

interface PaymentItem {
    method: 'CASH' | 'CARD' | 'TRANSFER';
    amount: number;
    received: number;
    change: number;
    mpPaymentId?: string | null;
    mpFee?: number | null;
}

interface AppliedCoupon {
    id: string;
    code: string;
    name: string;
    category: string;
    type: string;
    value: number;
}

type TerminalStatus = 'idle' | 'creating' | 'connecting' | 'waiting' | 'processing' | 'approved' | 'rejected' | 'cancelled';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onFinalize: (paymentData: any) => void;
    cartItems?: { serviceId?: string | null; price: number }[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen, onClose, total, onFinalize, cartItems = []
}) => {
    const business = useBusiness();

    // ---- Pagos ----
    const [payments, setPayments] = useState<PaymentItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
    const [amountReceived, setAmountReceived] = useState<string>('');

    // ---- Promociones ----
    const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);

    // ---- Cupón ----
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [tokenId, setTokenId] = useState<string | null>(null);
    const [coveredServiceIds, setCoveredServiceIds] = useState<string[]>([]);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    // ---- Terminal MP ----
    const [terminals, setTerminals] = useState<any[]>([]);
    const [terminalModes, setTerminalModes] = useState<Record<string, string>>({});
    const [modesLoading, setModesLoading] = useState(false);
    const [terminalToConfigure, setTerminalToConfigure] = useState<any | null>(null);
    const [manualConfigTerminal, setManualConfigTerminal] = useState<any | null>(null);
    const [configuringMode, setConfiguringMode] = useState(false);

    const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
    const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>('idle');
    const [terminalError, setTerminalError] = useState<string | null>(null);
    const [terminalMpFee, setTerminalMpFee] = useState<number | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentIntentIdRef = useRef<string | null>(null);
    // Cuenta sondeos consecutivos en estado OPEN para detectar terminal no conectada
    const openPollsRef = useRef(0);
    // ~7 sondeos x 3s ≈ 21s sin que el cobro llegue al dispositivo => no responde
    const MAX_OPEN_POLLS = 7;
    // Evita finalizar la venta más de una vez tras aprobarse el cobro con tarjeta
    const autoFinalizedRef = useRef(false);

    const stopPolling = () => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    };

    // Cancela en MP un intent que quedó en OPEN (cancelable) para permitir reintentar.
    const cancelStuckIntent = (intentId: string) => {
        const terminal = terminals.find(t => t.id === selectedTerminalId);
        if (!intentId || !terminal || !business?.id) return;
        fetch('/api/mp/payment-intent', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ posId: terminal.posId, businessId: business.id, intentId }),
        }).catch(() => null);
    };

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
            setCoveredServiceIds([]);
            setCouponError(null);
            setPromotionResult(null);
            setTerminalStatus('idle');
            setTerminalError(null);
            setTerminalMpFee(null);
            currentIntentIdRef.current = null;
            autoFinalizedRef.current = false;
            stopPolling();

            getActiveTerminals().then((t) => {
                setTerminals(t);
                // Preseleccionar: única terminal, o la marcada como predeterminada.
                if (t.length === 1) {
                    setSelectedTerminalId(t[0].id);
                } else if (t.length > 1) {
                    const def = t.find((x: any) => x.isDefault);
                    setSelectedTerminalId(def ? def.id : '');
                } else {
                    setSelectedTerminalId('');
                }
                
                // Fetch live status
                if (t.length > 0) {
                    setModesLoading(true);
                    checkTerminalsStatus(t).then(modes => {
                        setTerminalModes(modes);
                        setModesLoading(false);
                    }).catch(() => setModesLoading(false));
                } else {
                    setModesLoading(false);
                }
            }).catch(() => setTerminals([]));

            if (business?.id && cartItems.length > 0) {
                getActivePromotions(business.id)
                    .then((promos) => {
                        const result = applyPromotions(cartItems, promos);
                        if (result.applied.length > 0) setPromotionResult(result);
                    })
                    .catch(() => null);
            }
        }
        return () => stopPolling();
    }, [isOpen]);

    // ---- Cálculos ----
    const promoDiscount = promotionResult?.totalDiscount ?? 0;
    const subtotalAfterPromo = Math.max(0, total - promoDiscount);
    const effectiveTotal = Math.max(0, subtotalAfterPromo - discountAmount);
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
            const result = await validateCoupon(trimmed, subtotalAfterPromo, cartItems);
            if (!result.valid) {
                setCouponError(result.error);
                return;
            }
            setAppliedCoupon(result.coupon);
            setDiscountAmount(result.discount);
            setTokenId(result.tokenId ?? null);
            setCoveredServiceIds(result.coveredServiceIds ?? []);
            setCouponInput(result.coupon.code);
            setPayments([]);
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
        setCoveredServiceIds([]);
        setCouponInput('');
        setCouponError(null);
        setPayments([]);
    };

    // ---- Terminal MP handlers ----
    const handleChargeOnTerminal = async () => {
        if (!selectedTerminalId || !business?.id) return;
        const terminal = terminals.find(t => t.id === selectedTerminalId);
        if (!terminal) return;

        // Monto a cobrar: lo que escriban (acotado al saldo) o el saldo completo si está vacío.
        // Permite pagos parciales con tarjeta (ej. $5 de $10 y el resto en efectivo).
        const entered = Number(amountReceived);
        const balanceAtStart = balanceRemaining;
        const chargeAmount = (!isNaN(entered) && entered > 0)
            ? Math.min(entered, balanceAtStart)
            : balanceAtStart;
        if (chargeAmount <= 0) return;
        // ¿Este cobro cubre todo el saldo restante?
        const fullyPays = chargeAmount >= balanceAtStart - 0.001;

        setTerminalStatus('creating');
        setTerminalError(null);
        stopPolling();

        try {
            const res = await fetch('/api/mp/payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round(chargeAmount * 100) / 100,
                    posId: terminal.posId,
                    businessId: business.id,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al crear cobro');

            currentIntentIdRef.current = data.intentId;
            openPollsRef.current = 0;
            // OPEN al inicio: MP aún no entrega el cobro al dispositivo físico
            setTerminalStatus('connecting');

            pollRef.current = setInterval(async () => {
                try {
                    const pollRes = await fetch(
                        `/api/mp/payment-intent/${data.intentId}?businessId=${business.id}&terminalId=${selectedTerminalId}`
                    );
                    const pollData = await pollRes.json();
                    const state: string = pollData.state;

                    if (state === 'OPEN') {
                        openPollsRef.current += 1;
                        // Si nunca llega al dispositivo, asumimos que no está conectado
                        if (openPollsRef.current >= MAX_OPEN_POLLS) {
                            stopPolling();
                            cancelStuckIntent(data.intentId);
                            currentIntentIdRef.current = null;
                            setTerminalError('La terminal no responde. Verifica que esté encendida y conectada a internet, y vuelve a intentar.');
                            setTerminalStatus('rejected');
                            return;
                        }
                        setTerminalStatus('connecting');
                    } else if (state === 'ON_TERMINAL') {
                        openPollsRef.current = 0;
                        setTerminalStatus('waiting');
                    } else if (state === 'PROCESSING') {
                        setTerminalStatus('processing');
                    } else if (state === 'FINISHED') {
                        stopPolling();
                        setTerminalMpFee(pollData.mpFee ?? null);
                        setPayments(prev => [...prev, {
                            method: 'CARD',
                            amount: chargeAmount,
                            received: chargeAmount,
                            change: 0,
                            mpPaymentId: pollData.paymentId ?? null,
                            mpFee: pollData.mpFee ?? null,
                            mpNetReceived: pollData.netReceived ?? null,
                            mpTaxes: pollData.taxes ?? null,
                            mpReleaseDate: pollData.releaseDate ?? null,
                        }]);
                        setAmountReceived('');
                        if (fullyPays) {
                            // Cubre el total → se marca aprobado y la venta se finaliza sola
                            setTerminalStatus('approved');
                        } else {
                            // Pago parcial con tarjeta aprobado → seguir cobrando el resto
                            setTerminalStatus('idle');
                            toast.success(`Tarjeta aprobada: $${chargeAmount.toFixed(2)}. Falta cobrar el resto.`);
                        }
                    } else if (state === 'CANCELED') {
                        stopPolling();
                        setTerminalStatus('cancelled');
                    } else if (state === 'ERROR') {
                        stopPolling();
                        setTerminalError(pollData.rejected
                            ? 'Pago rechazado por el banco. No se cobró nada — intenta de nuevo u otra tarjeta.'
                            : 'Error en la terminal');
                        setTerminalStatus('rejected');
                    }
                } catch {
                    // polling errors are non-fatal
                }
            }, 3000);
        } catch (e: any) {
            setTerminalError(e.message || 'Error al conectar con la terminal');
            setTerminalStatus('rejected');
        }
    };

    const handleCancelTerminal = async () => {
        const intentId = currentIntentIdRef.current;
        const terminal = terminals.find(t => t.id === selectedTerminalId);

        if (business?.id && terminal && intentId) {
            try {
                const res = await fetch('/api/mp/payment-intent', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ posId: terminal.posId, businessId: business.id, intentId }),
                });

                // 409: el cobro ya está en la terminal — solo se cancela en el dispositivo.
                // Seguimos escuchando (no detenemos el polling) para detectar el resultado.
                if (res.status === 409) {
                    setTerminalError('El cobro ya está en la terminal. Cancélalo en el dispositivo físico.');
                    return;
                }
            } catch {
                // si falla la red, caemos a cancelación local
            }
        }

        stopPolling();
        setTerminalStatus('cancelled');
        currentIntentIdRef.current = null;
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
        const p = payments[index];
        if (p.mpPaymentId) {
            // Terminal payment was already processed, can't remove
            return;
        }
        setPayments(payments.filter((_, i) => i !== index));
    };

    const isConfirmDisabled = totalPaid < effectiveTotal || terminalStatus === 'connecting' || terminalStatus === 'waiting' || terminalStatus === 'processing' || terminalStatus === 'creating';

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
            promotionDiscount: promoDiscount,
            originalTotal: total,
            coveredServiceIds,
        });
    };

    // Al aprobarse el cobro con tarjeta, finaliza la venta automáticamente (una sola vez)
    // para que nadie se quede sin presionar "Confirmar". Pequeño delay para mostrar el "aprobado".
    useEffect(() => {
        if (terminalStatus !== 'approved' || autoFinalizedRef.current) return;
        if (totalPaid < effectiveTotal) return; // el cobro debe cubrir el total
        autoFinalizedRef.current = true;
        const t = setTimeout(() => handleConfirm(), 1200);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [terminalStatus, totalPaid, effectiveTotal]);

    const isTerminalActive = ['creating', 'connecting', 'waiting', 'processing'].includes(terminalStatus);

    // Con tarjeta + terminal integrada, el cobro SIEMPRE pasa por la terminal (no se puede
    // registrar un pago con tarjeta sin cobrarlo). Sin terminales, tarjeta = captura manual.
    const cardUsesTerminal = paymentMethod === 'CARD' && terminals.length > 0;
    const enteredNum = Number(amountReceived);
    const chargeAmountPreview = (!isNaN(enteredNum) && enteredNum > 0)
        ? Math.min(enteredNum, balanceRemaining)
        : balanceRemaining;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                // El ancho, el alto y el scroll los resuelve Modal: en celular
                // es hoja inferior a todo lo ancho y desde sm es caja centrada.
                // Antes `w-[95svw]` lo dejaba al 95% incluso en un iPhone, y el
                // contenedor interno abría un segundo scroll.
                className="max-w-lg overflow-hidden p-0 shadow-2xl"
                size="lg"
                showCloseButton={true}
            >
                <div className="flex flex-col">

                    {/* ── Header Total ── */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 text-center bg-gray-50/50 dark:bg-gray-800/30">
                        {(promoDiscount > 0 || appliedCoupon) ? (
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">
                                    ${total.toLocaleString()}
                                </span>
                                {promoDiscount > 0 && (
                                    <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Promociones — ahorras ${promoDiscount.toLocaleString()}
                                    </span>
                                )}
                                {appliedCoupon && (
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                        {appliedCoupon.category === 'COURTESY'
                                            ? 'Cortesía'
                                            : appliedCoupon.type === 'PERCENTAGE'
                                                ? `${appliedCoupon.value}% off`
                                                : 'Descuento fijo'} — ahorras ${discountAmount.toLocaleString()}
                                    </span>
                                )}
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

                        {/* ── Promociones aplicadas ── */}
                        {promotionResult && promotionResult.applied.length > 0 && (
                            <div className="p-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 space-y-1.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Promociones automáticas
                                </div>
                                {promotionResult.applied.map((a) => (
                                    <div key={a.promotionId} className="flex items-center justify-between text-sm">
                                        <div>
                                            <p className="font-semibold text-purple-800 dark:text-purple-300">{a.promotionName}</p>
                                            <p className="text-xs text-purple-600 dark:text-purple-400">{a.detail}</p>
                                        </div>
                                        <span className="font-bold text-purple-700 dark:text-purple-400 shrink-0 ml-2">
                                            -${a.discountAmount.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Sección Cupón ── */}
                        <div className="space-y-2">
                            <Label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                Cupón de descuento
                            </Label>

                            {appliedCoupon ? (
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
                                <div className="space-y-2">
                                    <div className="flex gap-2">
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
                                        <button
                                            onClick={() => applyCoupon(couponInput)}
                                            disabled={couponLoading || !couponInput.trim()}
                                            className="px-3 py-2.5 text-sm font-semibold rounded-xl border-2 border-brand-500 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 shrink-0"
                                        >
                                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                                        </button>
                                        <button
                                            onClick={() => setShowSearch(true)}
                                            className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                                            title="Buscar cupones genéricos (los foliados se ingresan manualmente o por QR)"
                                        >
                                            <Search className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setShowQR(true)}
                                            className="p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                                            title="Escanear código QR"
                                        >
                                            <QrCode className="w-4 h-4" />
                                        </button>
                                    </div>
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
                                                        {p.mpPaymentId && <span className="ml-1 text-xs text-blue-500 font-normal">· Terminal MP</span>}
                                                    </p>
                                                    {p.change > 0 && (
                                                        <p className="text-xs text-brand-500">
                                                            Recibido: ${p.received} (Cambio: ${p.change})
                                                        </p>
                                                    )}
                                                    {p.mpFee != null && p.mpFee > 0 && (
                                                        <p className="text-xs text-orange-500">
                                                            Comisión MP: -${p.mpFee.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="font-black text-gray-900 dark:text-white">
                                                    ${p.amount.toLocaleString()}
                                                </span>
                                                {!p.mpPaymentId && (
                                                    <button
                                                        onClick={() => handleRemovePayment(idx)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                )}
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
                                                onClick={() => {
                                                    setPaymentMethod(m);
                                                    if (m !== 'CARD') {
                                                        setTerminalStatus('idle');
                                                        stopPolling();
                                                    }
                                                }}
                                                disabled={isTerminalActive}
                                                className={`py-3 px-2 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all text-sm
                                                ${paymentMethod === m
                                                        ? m === 'CASH'
                                                            ? 'border-black bg-black text-white dark:border-white dark:bg-brand-500'
                                                            : 'border-blue-600 bg-blue-600 text-white'
                                                        : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'}
                                                ${isTerminalActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <span>{m === 'CASH' ? '💵' : m === 'CARD' ? '💳' : '🏦'}</span>
                                                {m === 'CASH' ? 'Efectivo' : m === 'CARD' ? 'Tarjeta' : 'Transfe.'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">

                                    {/* Cobro en curso / aprobado en terminal: solo se muestra el estado */}
                                    {cardUsesTerminal && (isTerminalActive || terminalStatus === 'approved') ? (
                                        <div className="space-y-2">
                                            {terminalStatus === 'creating' && (
                                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
                                                    <Loader2 className="w-5 h-5 animate-spin shrink-0 text-blue-600" />
                                                    <span className="font-medium">Enviando cobro a la terminal...</span>
                                                </div>
                                            )}
                                            {terminalStatus === 'connecting' && (
                                                <>
                                                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
                                                        <Loader2 className="w-5 h-5 animate-spin shrink-0 text-blue-600" />
                                                        <div>
                                                            <p className="font-bold">Conectando con la terminal...</p>
                                                            <p className="text-xs opacity-75">Verifica que el dispositivo esté encendido y con internet</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={handleCancelTerminal} className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                                        Cancelar cobro
                                                    </button>
                                                </>
                                            )}
                                            {terminalStatus === 'waiting' && (
                                                <>
                                                    <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-center gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                                                        <Loader2 className="w-5 h-5 animate-spin shrink-0 text-yellow-600" />
                                                        <div>
                                                            <p className="font-bold">Esperando en terminal</p>
                                                            <p className="text-xs opacity-75">El cliente debe acercar/insertar su tarjeta</p>
                                                        </div>
                                                    </div>
                                                    {terminalError && (
                                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                                                            <XCircle className="w-4 h-4 shrink-0" />
                                                            {terminalError}
                                                        </div>
                                                    )}
                                                    <button onClick={handleCancelTerminal} className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                                                        Cancelar cobro
                                                    </button>
                                                </>
                                            )}
                                            {terminalStatus === 'processing' && (
                                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-center gap-3 text-sm text-blue-800 dark:text-blue-200">
                                                    <Loader2 className="w-5 h-5 animate-spin shrink-0 text-blue-600" />
                                                    <div>
                                                        <p className="font-bold">Procesando pago...</p>
                                                        <p className="text-xs opacity-75">No retires la tarjeta</p>
                                                    </div>
                                                </div>
                                            )}
                                            {terminalStatus === 'approved' && (
                                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm">
                                                    <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-bold mb-1">
                                                        <CheckCircle className="w-4 h-4" />
                                                        Pago aprobado en terminal
                                                    </div>
                                                    {terminalMpFee != null && terminalMpFee > 0 && (
                                                        <p className="text-xs text-orange-600 dark:text-orange-400">
                                                            Comisión MP: -${terminalMpFee.toFixed(2)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Error de un cobro previo con tarjeta */}
                                            {cardUsesTerminal && (terminalStatus === 'rejected' || terminalStatus === 'cancelled') && (
                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                                                    <XCircle className="w-4 h-4 shrink-0" />
                                                    {terminalStatus === 'cancelled' ? 'Cobro cancelado' : terminalError || 'Pago rechazado en terminal'}
                                                </div>
                                            )}

                                            {/* Monto (permite pago parcial) */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                    {paymentMethod === 'CASH' ? 'Cantidad Recibida' : 'Cantidad a Cobrar'}
                                                    <span className="ml-1 font-normal text-gray-400">— déjalo vacío para el total</span>
                                                </label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                                    <InputField
                                                        type="number"
                                                        value={amountReceived}
                                                        onChange={(e) => setAmountReceived(e.target.value)}
                                                        className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-gray-300 dark:border-gray-700 rounded-xl focus:border-black dark:focus:border-white outline-none dark:bg-gray-800 dark:text-white"
                                                        placeholder={balanceRemaining.toFixed(2)}
                                                        onKeyDown={(e) => { if (e.key === 'Enter') { cardUsesTerminal ? handleChargeOnTerminal() : handleAddPayment(); } }}
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

                                            {/* Selector de terminal (si hay 2+) */}
                                            {cardUsesTerminal && terminals.length > 1 && (
                                                <div className="pt-2">
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                        Selecciona la Terminal
                                                    </label>
                                                    <div className="flex flex-wrap justify-center gap-3">
                                                        {terminals.map((t) => {
                                                            const mode = terminalModes[t.posId];
                                                            const isDisconnected = !modesLoading && mode !== "PDV";
                                                            return (
                                                                <button
                                                                    key={t.id}
                                                                    onClick={() => setSelectedTerminalId(t.id)}
                                                                    className={`min-h-11 flex-1 basis-[140px] max-w-[220px] p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all text-center relative ${
                                                                        isDisconnected
                                                                            ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400 hover:bg-orange-100'
                                                                            : selectedTerminalId === t.id
                                                                                ? 'border-brand-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm ring-1 ring-brand-500'
                                                                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-gray-300'
                                                                    }`}
                                                                >
                                                                    {isDisconnected && <AlertTriangle className="w-4 h-4 text-orange-500 absolute top-1 right-1" />}
                                                                    <p className="text-sm font-black line-clamp-1 w-full truncate px-1">{t.name}</p>
                                                                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isDisconnected ? 'text-orange-600 opacity-80' : 'text-green-600'}`}>
                                                                        {isDisconnected ? 'Desconectada' : 'Conectada'}
                                                                    </p>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    
                                                    {cardUsesTerminal && selectedTerminalId && terminalModes[terminals.find(t => t.id === selectedTerminalId)?.posId || ''] !== "PDV" && (
                                                        <div className="mt-4 p-4 rounded-xl bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 text-sm flex flex-col gap-2 animate-in fade-in">
                                                            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300 font-bold">
                                                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                                                Terminal Desconectada
                                                            </div>
                                                            <p className="text-orange-700 dark:text-orange-400">
                                                                El cobro <strong>no se enviará automáticamente</strong> a la maquinita. Deberás teclear el monto en tu app de Mercado Pago. Al registrarlo aquí, el dinero se sumará a los reportes de la cuenta asignada a esta terminal.
                                                            </p>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    const t = terminals.find(t => t.id === selectedTerminalId);
                                                                    if (t) setTerminalToConfigure(t);
                                                                }}
                                                                className="text-orange-600 dark:text-orange-400 font-bold underline text-left hover:text-orange-800 dark:hover:text-orange-300"
                                                            >
                                                                ¿Es una Point Smart / Air? Intentar conectar a internet (PDV)
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 mt-auto bg-gray-50/50 dark:bg-gray-800/30 flex gap-3">
                        {terminalStatus === 'approved' ? (
                            // Cobro con tarjeta aprobado: la venta se finaliza sola, sin botón que olvidar.
                            <div className="flex-1 py-3 flex items-center justify-center gap-2 rounded-xl bg-green-600 text-white font-bold">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Guardando venta...
                            </div>
                        ) : (
                            <>
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="flex-1 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl"
                                >
                                    Cancelar
                                </Button>
                                {balanceRemaining <= 0 ? (
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
                                ) : cardUsesTerminal ? (
                                    <button
                                        onClick={handleChargeOnTerminal}
                                        disabled={!selectedTerminalId || balanceRemaining <= 0}
                                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Cobrar ${chargeAmountPreview.toLocaleString()}
                                    </button>
                                ) : (
                                    <Button
                                        onClick={handleAddPayment}
                                        className="flex-1 py-3 shadow-lg"
                                        disabled={!canAddPayment}
                                    >
                                        Agregar Pago
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Modal>

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
                subtotal={subtotalAfterPromo}
            />

            <Modal isOpen={!!terminalToConfigure} onClose={() => setTerminalToConfigure(null)} className="max-w-sm">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Terminal Desconectada</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        La terminal <strong>{terminalToConfigure?.name}</strong> se encuentra en modo independiente (Standalone). 
                        Haz clic abajo para cambiarla a modo Integrado (PDV).
                        <br/><br/>
                        <span className="text-orange-600 font-bold dark:text-orange-400">¡Importante!</span> Después de activarla, <strong>deberás reiniciar físicamente la terminal</strong> (apagarla y prenderla) para que aplique el cambio antes de cobrar.
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={async () => {
                                if (!terminalToConfigure) return;
                                setConfiguringMode(true);
                                try {
                                    const r = await changeMpDeviceMode(terminalToConfigure.posId, "PDV", terminalToConfigure.mpAccessToken);
                                    if (r.isManualRequired) {
                                        setManualConfigTerminal(terminalToConfigure);
                                        setTerminalToConfigure(null);
                                    } else if (r.error) {
                                        toast.error(r.error);
                                    } else {
                                        toast.success("Terminal configurada correctamente. ¡Por favor REINICIALA ahora!");
                                        setTerminalModes(prev => ({ ...prev, [terminalToConfigure.posId]: "PDV" }));
                                        setSelectedTerminalId(terminalToConfigure.id);
                                        setTerminalToConfigure(null);
                                    }
                                } catch(e) {
                                    toast.error("Error al configurar terminal");
                                } finally {
                                    setConfiguringMode(false);
                                }
                            }}
                            disabled={configuringMode}
                            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl"
                        >
                            {configuringMode ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Vincular Terminal Ahora"}
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={() => setTerminalToConfigure(null)}
                            disabled={configuringMode}
                            className="w-full py-3 rounded-xl"
                        >
                            Cancelar
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

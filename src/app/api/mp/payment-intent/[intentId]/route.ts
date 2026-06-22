import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma2';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ intentId: string }> }
) {
    const { intentId } = await params;
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

    // --- SIMULACIÓN: los intents "SIM-<inicioMs>-<centavos>" avanzan por tiempo ---
    // ~3s en terminal, ~3s procesando, luego aprobado. Replica el flujo real de Point.
    if (intentId.startsWith('SIM-')) {
        const [, startStr, centsStr] = intentId.split('-');
        const start = Number(startStr);
        const amountCents = Number(centsStr) || 0;
        const elapsed = (Date.now() - start) / 1000;

        let state = 'ON_TERMINAL';
        let paymentId: string | null = null;
        let mpFee: number | null = null;
        let netReceived: number | null = null;
        let releaseDate: string | null = null;

        if (elapsed >= 6) {
            state = 'FINISHED';
            paymentId = `SIM-PAY-${start}`;
            mpFee = Math.round(amountCents * 0.0359) / 100; // comisión simulada ~3.59%
            netReceived = Math.round((amountCents / 100 - mpFee) * 100) / 100;
            releaseDate = null;
        } else if (elapsed >= 3) {
            state = 'PROCESSING';
        }

        return NextResponse.json({ state, paymentId, mpFee, netReceived, taxes: null, releaseDate, simulated: true });
    }

    if (!businessId) {
        return NextResponse.json({ error: 'businessId requerido' }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true },
    });

    if (!business?.mpAccessToken) {
        return NextResponse.json({ error: 'Sin token MP' }, { status: 400 });
    }

    const intentRes = await fetch(
        `https://api.mercadopago.com/point/integration-api/payment-intents/${intentId}`,
        { headers: { Authorization: `Bearer ${business.mpAccessToken}` } }
    );

    if (!intentRes.ok) {
        return NextResponse.json({ error: 'Intent no encontrado', state: 'ERROR' }, { status: intentRes.status });
    }

    const intentData = await intentRes.json();
    const state: string = intentData.state;

    let mpFee: number | null = null;
    let paymentId: string | null = null;
    let netReceived: number | null = null;
    let taxes: number | null = null;
    let releaseDate: string | null = null;

    if (state === 'FINISHED' && intentData.payment?.id) {
        paymentId = intentData.payment.id.toString();

        const payRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            { headers: { Authorization: `Bearer ${business.mpAccessToken}` } }
        );

        if (payRes.ok) {
            const payData = await payRes.json();

            // ⚠️ El intent puede llegar a FINISHED aunque el pago haya sido RECHAZADO.
            // Solo tratamos como cobro exitoso si el pago está 'approved'. Si no,
            // devolvemos ERROR para que el front NO registre una venta sin cobro real.
            if (payData.status !== 'approved') {
                return NextResponse.json({
                    state: 'ERROR',
                    paymentId: null,
                    rejected: true,
                    statusDetail: payData.status_detail || payData.status || 'rejected',
                });
            }

            // Sum all fees paid by the seller (merchant)
            const fees = (payData.fee_details || payData.fee_detail || []) as { fee_payer: string; amount: number }[];
            const totalFee = fees
                .filter(f => f.fee_payer === 'collector')
                .reduce((sum, f) => sum + (f.amount || 0), 0);

            // Monto NETO real que entra a la cuenta (ya con comisión + IVA descontados)
            const td = payData.transaction_details || {};
            netReceived = td.net_received_amount ?? null;

            // Comisión: preferimos derivarla del neto (incluye IVA); si no, sumamos fee_details
            if (netReceived != null && payData.transaction_amount != null) {
                mpFee = Math.round((payData.transaction_amount - netReceived) * 100) / 100;
            } else {
                mpFee = totalFee > 0 ? totalFee : null;
            }
            if (mpFee != null && mpFee <= 0) mpFee = null;

            taxes = payData.taxes_amount ?? null;
            releaseDate = payData.money_release_date ?? null;
        }
    }

    return NextResponse.json({ state, paymentId, mpFee, netReceived, taxes, releaseDate });
}

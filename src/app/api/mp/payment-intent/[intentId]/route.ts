import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma2';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ intentId: string }> }
) {
    const { intentId } = await params;
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');

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

    if (state === 'FINISHED' && intentData.payment?.id) {
        paymentId = intentData.payment.id.toString();

        const payRes = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            { headers: { Authorization: `Bearer ${business.mpAccessToken}` } }
        );

        if (payRes.ok) {
            const payData = await payRes.json();
            // Sum all fees paid by the seller (merchant)
            const fees = (payData.fee_detail || []) as { fee_payer: string; amount: number }[];
            const totalFee = fees
                .filter(f => f.fee_payer === 'collector')
                .reduce((sum, f) => sum + (f.amount || 0), 0);
            // Fallback: transaction_amount - net received
            mpFee = totalFee > 0
                ? totalFee
                : (payData.transaction_amount || 0) - (payData.transaction_net_amount || payData.transaction_amount || 0);
            if (mpFee <= 0) mpFee = null;
        }
    }

    return NextResponse.json({ state, paymentId, mpFee });
}

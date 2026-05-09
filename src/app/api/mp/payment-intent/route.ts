import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma2';

export async function POST(req: NextRequest) {
    const { amount, description, posId, businessId } = await req.json();

    if (!amount || !posId || !businessId) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true },
    });

    if (!business?.mpAccessToken) {
        return NextResponse.json({ error: 'No hay token de MercadoPago configurado' }, { status: 400 });
    }

    const mpRes = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${posId}/payment-intents`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${business.mpAccessToken}`,
            },
            body: JSON.stringify({
                amount,
                description: description || 'Cobro en salon',
                payment: { type: 'credit_card' },
            }),
        }
    );

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
        console.error('MP error creating intent:', mpData);
        return NextResponse.json({ error: mpData?.message || 'Error al crear cobro en terminal' }, { status: mpRes.status });
    }

    return NextResponse.json({ intentId: mpData.id });
}

export async function DELETE(req: NextRequest) {
    const { posId, businessId } = await req.json();

    if (!posId || !businessId) {
        return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true },
    });

    if (!business?.mpAccessToken) {
        return NextResponse.json({ error: 'Sin token MP' }, { status: 400 });
    }

    const mpRes = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${posId}/payment-intents`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${business.mpAccessToken}` },
        }
    );

    if (!mpRes.ok && mpRes.status !== 404) {
        const body = await mpRes.text();
        return NextResponse.json({ error: body }, { status: mpRes.status });
    }

    return NextResponse.json({ cancelled: true });
}

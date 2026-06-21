import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma2';

// Modo simulación: probar el flujo de cobro sin terminal física ni llamadas a MercadoPago.
// Apagado por defecto. Se activa con MP_SIMULATE=true en .env (NO usar en producción).
const SIMULATE = process.env.MP_SIMULATE === 'true';

export async function POST(req: NextRequest) {
    const { amount, posId, businessId } = await req.json();

    if (!amount || !posId || !businessId) {
        return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // --- SIMULACIÓN: devolvemos un intent virtual con el monto codificado en el id ---
    if (SIMULATE) {
        const amountCents = Math.round(Number(amount) * 100);
        const intentId = `SIM-${Date.now()}-${amountCents}`;
        return NextResponse.json({ intentId, simulated: true });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true },
    });

    if (!business?.mpAccessToken) {
        return NextResponse.json({ error: 'No hay token de MercadoPago configurado' }, { status: 400 });
    }

    // La API de Point exige el monto en CENTAVOS (entero) y un mínimo de $5 (500 centavos).
    const amountCents = Math.round(Number(amount) * 100);
    if (amountCents < 500) {
        return NextResponse.json({ error: 'El monto mínimo para cobrar en terminal es $5.00' }, { status: 400 });
    }

    const mpRes = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${posId}/payment-intents`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${business.mpAccessToken}`,
            },
            // El esquema actual de Point solo acepta amount + additional_info.
            // (description y payment.type ya NO se permiten y devuelven 400.)
            body: JSON.stringify({
                amount: amountCents,
                additional_info: { print_on_terminal: true },
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
    const { posId, businessId, intentId } = await req.json();

    if (!posId || !businessId) {
        return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // --- SIMULACIÓN: cancelación sin tocar MercadoPago ---
    if (SIMULATE) {
        return NextResponse.json({ cancelled: true, simulated: true });
    }

    if (!intentId) {
        return NextResponse.json({ error: 'Falta intentId para cancelar' }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true },
    });

    if (!business?.mpAccessToken) {
        return NextResponse.json({ error: 'Sin token MP' }, { status: 400 });
    }

    // La cancelación va sobre el intent específico (la URL sin intentId devuelve 405).
    const mpRes = await fetch(
        `https://api.mercadopago.com/point/integration-api/devices/${posId}/payment-intents/${intentId}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${business.mpAccessToken}` },
        }
    );

    // 409 = el cobro ya está ON_TERMINAL: solo se puede cancelar desde el dispositivo físico.
    if (mpRes.status === 409) {
        return NextResponse.json(
            { error: 'on_terminal', message: 'El cobro ya está en la terminal. Cancélalo desde el dispositivo.' },
            { status: 409 }
        );
    }

    if (!mpRes.ok && mpRes.status !== 404) {
        const body = await mpRes.text();
        return NextResponse.json({ error: body }, { status: mpRes.status });
    }

    return NextResponse.json({ cancelled: true });
}

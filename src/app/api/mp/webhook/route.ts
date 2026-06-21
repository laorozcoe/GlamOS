import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import prisma from '@/lib/prisma2';

// Webhook de MercadoPago: recibe avisos de pago y guarda el monto NETO real
// (ya descontada comisión + IVA) en la venta correspondiente.
//
// La URL a registrar en el panel de MP (Webhooks > Pagos) debe incluir el negocio:
//   https://TU-DOMINIO/api/mp/webhook?businessId=<ID_DEL_NEGOCIO>
//
// Cada negocio guarda su propio secreto (mpWebhookSecret) para validar la firma.

export const runtime = 'nodejs';

// Valida la firma x-signature: HMAC-SHA256 de "id:<dataId>;request-id:<reqId>;ts:<ts>;"
function isValidSignature(opts: {
    xSignature: string | null;
    xRequestId: string | null;
    dataId: string | null;
    secret: string;
}): boolean {
    const { xSignature, xRequestId, dataId, secret } = opts;
    if (!xSignature) return false;

    // x-signature: "ts=1700000000,v1=abc123..."
    const parts = Object.fromEntries(
        xSignature.split(',').map((kv) => {
            const [k, v] = kv.split('=');
            return [k?.trim(), v?.trim()];
        })
    );
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    let manifest = '';
    if (dataId) manifest += `id:${dataId};`;
    if (xRequestId) manifest += `request-id:${xRequestId};`;
    manifest += `ts:${ts};`;

    const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    try {
        return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
    } catch {
        return false;
    }
}

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');

    // data.id y type llegan por query string y/o por body
    let body: any = {};
    try { body = await req.json(); } catch { /* puede venir vacío */ }

    const type = body?.type || url.searchParams.get('type') || body?.topic || url.searchParams.get('topic');
    const dataId = body?.data?.id?.toString() || url.searchParams.get('data.id') || url.searchParams.get('id');

    if (!businessId) {
        // Sin businessId no sabemos a qué cuenta pertenece; respondemos 200 para que MP no reintente en loop.
        return NextResponse.json({ received: true, warning: 'businessId ausente en la URL del webhook' });
    }

    const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { mpAccessToken: true, mpWebhookSecret: true },
    });

    // Validación de firma (si hay secreto configurado)
    if (business?.mpWebhookSecret) {
        const valid = isValidSignature({
            xSignature: req.headers.get('x-signature'),
            xRequestId: req.headers.get('x-request-id'),
            dataId,
            secret: business.mpWebhookSecret,
        });
        if (!valid) {
            return NextResponse.json({ error: 'Firma inválida' }, { status: 401 });
        }
    }

    // Solo nos interesan los avisos de pago
    if (type !== 'payment' || !dataId) {
        return NextResponse.json({ received: true });
    }

    if (!business?.mpAccessToken) {
        return NextResponse.json({ received: true, warning: 'Sin token MP' });
    }

    // Consultamos el pago para obtener el neto real liquidado
    try {
        const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
            headers: { Authorization: `Bearer ${business.mpAccessToken}` },
            cache: 'no-store',
        });
        if (payRes.ok) {
            const pay = await payRes.json();
            const td = pay.transaction_details || {};
            const net = td.net_received_amount ?? null;
            const fee = net != null && pay.transaction_amount != null
                ? Math.round((pay.transaction_amount - net) * 100) / 100
                : null;
            const taxes = pay.taxes_amount ?? null;
            const release = pay.money_release_date ? new Date(pay.money_release_date) : null;

            // Actualizamos la venta que tenga este pago de MP (si ya existe)
            await prisma.$executeRawUnsafe(
                `UPDATE "Sale" SET "mpFee" = COALESCE($1, "mpFee"),
                                   "mpNetReceived" = COALESCE($2, "mpNetReceived"),
                                   "mpTaxes" = COALESCE($3, "mpTaxes"),
                                   "mpReleaseDate" = COALESCE($4, "mpReleaseDate")
                 WHERE "mpPaymentId" = $5 AND "businessId" = $6`,
                fee, net, taxes, release, dataId, businessId
            );
        }
    } catch (e) {
        console.error('Webhook MP: error al procesar pago', e);
        // Devolvemos 200 igualmente para evitar reintentos infinitos; MP reintenta ante 5xx.
    }

    return NextResponse.json({ received: true });
}

// MercadoPago a veces hace un GET de verificación al guardar la URL.
export async function GET() {
    return NextResponse.json({ ok: true });
}

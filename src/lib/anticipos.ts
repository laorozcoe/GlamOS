"use server";

import prisma from "@/lib/prisma2";
import { requireSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Anticipos de una cita.
 *
 * El anticipo ABRE la venta: se crea con folio y estado PENDING, y el
 * anticipo es su primer pago. El dia de la cita se le agregan los pagos del
 * resto a esa misma venta y pasa a COMPLETED.
 *
 * Se hace asi y no con una tabla aparte por dos razones. El dinero entra a la
 * caja el dia que se recibe, y el corte suma pagos por su propia fecha, asi
 * que el anticipo cuadra solo. Y el historial del cliente queda en una sola
 * venta en vez de partido en dos.
 *
 * Mientras la venta este PENDING no cuenta en reportes, nomina ni comisiones:
 * todos filtran por COMPLETED. La comision se gana cuando se hace el trabajo,
 * no cuando se aparta.
 */

export type DatosAnticipo = {
  appointmentId: string;
  amount: number;
  method: "CASH" | "CARD" | "TRANSFER";
};

/** Lo que hace falta para imprimir el comprobante y para pintar la pantalla. */
export type ResumenAnticipo = {
  folio: number;
  total: number;
  anticipado: number;
  saldo: number;
  fecha: Date;
  fin: Date;
  especialista: string;
  cliente: string;
  servicios: { descripcion: string; precio: number }[];
  metodo: string;
};

async function cargarCita(businessId: string, appointmentId: string) {
  const cita = await prisma.appointment.findFirst({
    where: { id: appointmentId, businessId, active: true },
    include: {
      services: { include: { service: true } },
      employee: { include: { user: true } },
      sale: { include: { payments: { where: { active: true, status: "COMPLETED" } } } },
    },
  });
  if (!cita) throw new Error("Esa cita no existe en este salón.");
  return cita;
}

function totalDeLaCita(cita: any): number {
  const porServicios = (cita.services ?? []).reduce(
    (acc: number, s: any) => acc + (s.price ?? 0),
    0
  );
  // `totalAmount` es lo que la pantalla mostro al agendar; los servicios son
  // la verdad del ticket. Se toma el mayor de los dos para no cobrar de menos
  // si alguno quedo sin precio.
  return Math.max(porServicios, cita.totalAmount ?? 0);
}

function pagado(cita: any): number {
  return (cita.sale?.payments ?? []).reduce((acc: number, p: any) => acc + p.amount, 0);
}

/** Cuanto se debe todavia de una cita. Lo usa el modal antes de pedir el monto. */
export async function getSaldoDeCita(appointmentId: string) {
  const { business } = await requireSession(["ADMIN", "RECEPTION"]);
  const cita = await cargarCita(business.id, appointmentId);

  const total = totalDeLaCita(cita);
  const anticipado = pagado(cita);

  return {
    total,
    anticipado,
    saldo: Math.max(0, total - anticipado),
    cobrada: cita.sale?.status === "COMPLETED",
    servicios: (cita.services ?? []).map((s: any) => ({
      descripcion: s.service?.name ?? "Servicio",
      precio: s.price ?? 0,
    })),
  };
}

/**
 * Registra un anticipo sobre una cita y devuelve lo necesario para el ticket.
 */
export async function registrarAnticipo(datos: DatosAnticipo): Promise<ResumenAnticipo> {
  const ctx = await requireSession(["ADMIN", "RECEPTION"]);
  const businessId = ctx.business.id;

  const cita = await cargarCita(businessId, datos.appointmentId);

  if (cita.sale?.status === "COMPLETED") {
    throw new Error("Esa cita ya está cobrada por completo.");
  }
  if ((cita.services ?? []).length === 0) {
    throw new Error("Agrega al menos un servicio antes de registrar un anticipo.");
  }

  const total = totalDeLaCita(cita);
  const yaPagado = pagado(cita);
  const saldo = Math.max(0, total - yaPagado);

  const monto = Math.round((Number(datos.amount) || 0) * 100) / 100;
  if (monto <= 0) throw new Error("El anticipo debe ser mayor a cero.");
  if (monto > saldo) {
    throw new Error(
      `El anticipo no puede pasar del saldo pendiente (${saldo.toFixed(2)}).`
    );
  }

  const items = (cita.services ?? []).map((s: any) => ({
    serviceId: s.serviceId ?? null,
    description: s.service?.name ?? "Servicio",
    price: s.price ?? 0,
    quantity: 1,
  }));

  const venta = await prisma.$transaction(async (tx) => {
    // La venta puede existir ya de un anticipo anterior: Sale.appointmentId es
    // unico, asi que crear otra fallaria.
    if (cita.sale) {
      await tx.payment.create({
        data: {
          saleId: cita.sale.id,
          businessId,
          amount: monto,
          method: datos.method as any,
          amountReceived: monto,
          changeReturned: 0,
          status: "COMPLETED",
          isDeposit: true,
        },
      });
      return tx.sale.findUniqueOrThrow({ where: { id: cita.sale.id } });
    }

    return tx.sale.create({
      data: {
        businessId,
        employeeId: cita.employeeId,
        clientId: cita.clientId,
        appointmentId: cita.id,
        subtotal: total,
        discount: 0,
        total,
        // Abierta: el servicio todavia no se da.
        status: "PENDING",
        items: { create: items },
        payments: {
          create: {
            businessId,
            amount: monto,
            method: datos.method as any,
            amountReceived: monto,
            changeReturned: 0,
            status: "COMPLETED",
            isDeposit: true,
          },
        },
      },
    });
  });

  const anticipado = yaPagado + monto;

  await prisma.appointment.update({
    where: { id: cita.id },
    data: {
      paymentStatus: anticipado >= total ? "PAID" : "PARTIALLY_PAID",
      totalAmount: total,
    },
  });

  revalidatePath("/calendar");

  return {
    folio: venta.folio,
    total,
    anticipado,
    saldo: Math.max(0, total - anticipado),
    fecha: cita.start,
    fin: cita.end,
    especialista: `${cita.employee.user.name} ${cita.employee.user.lastName}`,
    cliente: cita.guestName || "Público general",
    servicios: items.map((i) => ({ descripcion: i.description, precio: i.price })),
    metodo: datos.method,
  };
}

/**
 * Que hacer con el anticipo cuando se cancela la cita.
 *
 * - `devolver`: sale de la caja hoy. El pago queda REFUNDED y la venta tambien.
 * - `penalizacion`: el salon se queda el dinero. La venta se cierra por el
 *   monto ya cobrado, para que siga cuadrando contra la caja del dia en que
 *   entro.
 * - `a_favor`: la venta queda abierta y el dinero disponible; se aplica a otra
 *   cita a mano.
 */
export type DestinoAnticipo = "devolver" | "penalizacion" | "a_favor";

export async function resolverAnticipoDeCitaCancelada(
  appointmentId: string,
  destino: DestinoAnticipo
) {
  const ctx = await requireSession(["ADMIN", "RECEPTION"]);
  const businessId = ctx.business.id;

  const cita = await cargarCita(businessId, appointmentId);
  if (!cita.sale) return { ok: true, sinAnticipo: true };

  const anticipado = pagado(cita);

  if (destino === "devolver") {
    await prisma.$transaction(async (tx) => {
      await tx.payment.updateMany({
        where: { saleId: cita.sale!.id, active: true },
        data: { status: "REFUNDED" },
      });
      await tx.sale.update({
        where: { id: cita.sale!.id },
        data: { status: "REFUNDED", notes: "Cita cancelada, anticipo devuelto." },
      });
    });
  } else if (destino === "penalizacion") {
    // Se cierra por lo cobrado: el salon se queda el anticipo y la venta deja
    // de estar abierta. El importe coincide con lo que entro a la caja.
    await prisma.sale.update({
      where: { id: cita.sale.id },
      data: {
        status: "COMPLETED",
        subtotal: anticipado,
        total: anticipado,
        notes: "Cita cancelada, el anticipo se retuvo como penalización.",
      },
    });
  }
  // `a_favor` no toca nada: la venta sigue abierta con el dinero dentro.

  revalidatePath("/calendar");
  return { ok: true, destino, anticipado };
}

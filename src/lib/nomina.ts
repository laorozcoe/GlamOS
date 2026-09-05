import "server-only";

import prisma from "@/lib/prisma2";
import { esRetardo, horarioDelDia } from "@/lib/asistencia";
import { aTextoFecha, rangoSemana } from "@/lib/periodo";

/**
 * El calculo de la nomina de un periodo, en un solo lugar.
 *
 * Antes vivia dentro de la pantalla de nomina, y el detalle por ticket usaba
 * una formula distinta a la del encabezado: los renglones sumaban mas que el
 * total. Aqui hay una sola definicion de "cuanto genero esta persona" y todo
 * -encabezado, detalle y bonos- se calcula a partir de ella.
 */

export type EstadoBono = {
  ruleId: string;
  nombre: string;
  tipo: string;
  /** Lo que se paga si se gana. Puede venir ajustado por un otorgamiento manual. */
  monto: number;
  /** El monto que dice el catalogo, para poder volver a el. */
  montoCatalogo: number;
  ganado: boolean;
  /**
   * Lo que decia el calculo, antes de cualquier ajuste manual. `null` en los
   * bonos manuales, que no se calculan. Sirve para exigir una nota solo
   * cuando alguien contradice al sistema.
   */
  calculado: boolean | null;
  /** Por que se gano o por que no. Es lo que se le explica a la empleada. */
  motivo: string;
  /** Se decide a mano, no se calcula. */
  manual: boolean;
  /** Alguien lo forzo -a favor o en contra- de lo que decia el calculo. */
  ajustado: boolean;
  /** Ya existe una decision manual guardada para este bono en este periodo. */
  decidido: boolean;
  nota: string | null;
};

const pesos = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

/**
 * Retardos, faltas y dias capturados de cada empleado en un rango.
 *
 * `esperados` cuenta los dias del rango que ya pasaron y en los que la persona
 * tenia horario. `capturados` cuenta los que ademas alguien confirmo: una hora
 * escrita a mano, una marca de checador, o una falta. La diferencia entre los
 * dos importa porque la hora se precarga con el horario, asi que un dia que
 * nadie toco NO prueba que la persona haya llegado a tiempo.
 */
export async function resumenAsistencia(businessId: string, inicio: Date, fin: Date) {
  const [negocio, empleados, registros] = await Promise.all([
    prisma.business.findUnique({
      where: { id: businessId },
      select: { lateToleranceMinutes: true },
    }),
    prisma.employee.findMany({
      where: { businessId, active: true },
      select: {
        id: true,
        workScheduleStartWeekday: true, workScheduleEndWeekday: true,
        workScheduleStartSaturday: true, workScheduleEndSaturday: true,
      },
    }),
    prisma.attendance.findMany({ where: { businessId, date: { gte: inicio, lte: fin } } }),
  ]);

  const tolerancia = negocio?.lateToleranceMinutes ?? 10;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  const resumen = new Map<
    string,
    { retardos: number; faltas: number; justificadas: number; capturados: number; esperados: number }
  >();

  for (const emp of empleados) {
    let retardos = 0, faltas = 0, justificadas = 0, capturados = 0, esperados = 0;

    for (const dia = new Date(inicio); dia <= fin; dia.setDate(dia.getDate() + 1)) {
      if (dia > hoy) break; // los dias que no han llegado no se cuentan
      const { entrada } = horarioDelDia(emp, dia.getDay());
      if (!entrada) continue; // ese dia no trabaja
      esperados++;

      const texto = aTextoFecha(dia);
      const reg = registros.find(
        (r) => r.employeeId === emp.id && aTextoFecha(new Date(r.date)) === texto
      );
      if (!reg) continue;

      if (reg.status === "ABSENT") { faltas++; capturados++; continue; }
      if (reg.status === "EXCUSED") { justificadas++; capturados++; continue; }

      if (reg.source !== "SCHEDULE") capturados++;
      if (esRetardo(reg.checkInTime, entrada, tolerancia)) retardos++;
    }

    resumen.set(emp.id, { retardos, faltas, justificadas, capturados, esperados });
  }

  return resumen;
}

/**
 * Cuanto genero cada venta para quien la atendio.
 *
 * La comision se paga sobre SERVICIOS, no sobre productos, y el descuento del
 * ticket -cupon o promocion- se reparte entre servicios y productos en
 * proporcion a lo que pesa cada parte. Es la regla que ya existia; lo que
 * cambia es que ahora tambien la usa el detalle por ticket.
 */
function servicioNetoDeVenta(venta: any) {
  const items = venta.items || [];
  const servicios = items
    .filter((i: any) => i.productId === null)
    .reduce((acc: number, i: any) => acc + i.price * i.quantity, 0);
  const productos = items
    .filter((i: any) => i.productId !== null)
    .reduce((acc: number, i: any) => acc + i.price * i.quantity, 0);

  let neto = servicios;
  const descuento = (venta.discount || 0) + (venta.promotionDiscount || 0);
  if (descuento > 0 && servicios > 0) {
    const subtotal = servicios + productos;
    neto -= descuento * (subtotal > 0 ? servicios / subtotal : 1);
  }

  const cantidadServicios = items
    .filter((i: any) => i.productId === null)
    .reduce((acc: number, i: any) => acc + (i.quantity || 0), 0);

  return { servicios, productos, neto, cantidadServicios };
}

/** Evalua un bono automatico contra lo que la persona logro en el periodo. */
function evaluarBono(
  regla: any,
  metricas: {
    servicios: number;
    clientes: number;
    vendido: number;
    retardos: number;
    faltas: number;
    capturados: number;
    esperados: number;
  }
): { ganado: boolean; motivo: string } {
  switch (regla.type) {
    case "PUNCTUALITY": {
      const sinCapturar = metricas.esperados - metricas.capturados;
      // Un dia sin capturar quedo con el horario precargado, y eso no prueba
      // que la persona haya llegado a tiempo. No se da por bueno.
      if (sinCapturar > 0) {
        return {
          ganado: false,
          motivo: `${sinCapturar} ${sinCapturar === 1 ? "día sin capturar" : "días sin capturar"} en asistencia`,
        };
      }
      if (metricas.retardos > regla.maxLates) {
        return {
          ganado: false,
          motivo: `${metricas.retardos} ${metricas.retardos === 1 ? "retardo" : "retardos"}, se permiten ${regla.maxLates}`,
        };
      }
      if (metricas.faltas > regla.maxAbsences) {
        return {
          ganado: false,
          motivo: `${metricas.faltas} ${metricas.faltas === 1 ? "falta" : "faltas"}, se permiten ${regla.maxAbsences}`,
        };
      }
      return {
        ganado: true,
        motivo: metricas.retardos === 0 ? "sin retardos ni faltas" : `${metricas.retardos} retardos, dentro de lo permitido`,
      };
    }

    case "SERVICES": {
      const meta = regla.goal ?? 0;
      const ganado = metricas.servicios >= meta;
      return {
        ganado,
        motivo: `${metricas.servicios} de ${meta} servicios`,
      };
    }

    case "REVENUE": {
      const meta = regla.goal ?? 0;
      const ganado = metricas.vendido >= meta;
      return {
        ganado,
        motivo: `${pesos(metricas.vendido)} de ${pesos(meta)}`,
      };
    }

    case "CLIENTS": {
      const meta = regla.goal ?? 0;
      const ganado = metricas.clientes >= meta;
      return {
        ganado,
        motivo: `${metricas.clientes} de ${meta} clientes`,
      };
    }

    default:
      return { ganado: false, motivo: "se otorga a criterio" };
  }
}

/**
 * La nomina de la semana que contiene `fechaReferencia`, con el dia de corte
 * del salon.
 */
export async function calcularNomina(businessId: string, fechaReferencia: Date) {
  const negocio = await prisma.business.findUnique({
    where: { id: businessId },
    select: { weekStartDay: true },
  });

  const { inicio, fin } = rangoSemana(fechaReferencia, negocio?.weekStartDay ?? 1);

  const [empleados, ventas, reglas, otorgamientos, asistencia] = await Promise.all([
    prisma.employee.findMany({
      // `inPayroll` y no `bookable`: quien atiende no necesariamente cobra
      // aqui, y quien cobra no necesariamente atiende.
      where: { businessId, active: true, inPayroll: true, user: { active: true } },
      include: { user: true },
    }),
    prisma.sale.findMany({
      where: {
        businessId,
        status: "COMPLETED",
        active: true,
        createdAt: { gte: inicio, lte: fin },
      },
      include: { items: true, client: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bonusRule.findMany({
      where: { businessId, active: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    prisma.bonusAward.findMany({
      where: { businessId, periodStart: inicio },
    }),
    resumenAsistencia(businessId, inicio, fin),
  ]);

  const nomina = empleados.map((empleado) => {
    const ventasDelEmpleado = ventas.filter((v) => v.employeeId === empleado.id);

    let serviciosNetos = 0;
    let productosVendidos = 0;
    let cantidadServicios = 0;
    let vendidoTotal = 0;
    const clientes = new Set<string>();

    const detalle = ventasDelEmpleado.map((venta) => {
      const d = servicioNetoDeVenta(venta);
      serviciosNetos += d.neto;
      productosVendidos += d.productos;
      cantidadServicios += d.cantidadServicios;
      vendidoTotal += venta.total;
      // "Público general" va sin cliente, asi que no se puede distinguir a una
      // persona de otra: esas ventas no cuentan para el bono por clientes.
      if (venta.clientId) clientes.add(venta.clientId);

      return {
        ...venta,
        /** Comision de ESTE ticket, con la misma regla que el encabezado. */
        comision: d.neto * (empleado.commission / 100),
        servicioNeto: d.neto,
      };
    });

    const comision = serviciosNetos * (empleado.commission / 100);
    const asist = asistencia.get(empleado.id) ?? {
      retardos: 0, faltas: 0, justificadas: 0, capturados: 0, esperados: 0,
    };

    const metricas = {
      servicios: cantidadServicios,
      clientes: clientes.size,
      vendido: vendidoTotal,
      ...asist,
    };

    const bonos: EstadoBono[] = reglas.map((regla) => {
      const otorgado = otorgamientos.find(
        (o) => o.employeeId === empleado.id && o.ruleId === regla.id
      );
      const manual = regla.type === "MANUAL";

      const calculado = manual
        ? { ganado: false, motivo: "se otorga a criterio" }
        : evaluarBono(regla, metricas);

      // Un otorgamiento manual gana sobre el calculo, en los dos sentidos: se
      // puede dar un bono que el sistema nego y quitar uno que concedio.
      const ganado = otorgado ? otorgado.granted : calculado.ganado;
      const ajustado = !!otorgado && !manual && otorgado.granted !== calculado.ganado;

      return {
        ruleId: regla.id,
        nombre: regla.name,
        tipo: regla.type,
        monto: otorgado?.amount ?? regla.amount,
        montoCatalogo: regla.amount,
        ganado,
        calculado: manual ? null : calculado.ganado,
        motivo: otorgado?.note?.trim()
          ? otorgado.note.trim()
          : manual && !otorgado
            ? "pendiente de decidir"
            : calculado.motivo,
        manual,
        ajustado,
        decidido: !!otorgado,
        nota: otorgado?.note ?? null,
      };
    });

    const bonosTotal = bonos.reduce((acc, b) => acc + (b.ganado ? b.monto : 0), 0);

    return {
      employeeId: empleado.id,
      name: `${empleado.user.name} ${empleado.user.lastName}`,
      role: empleado.role,
      baseSalary: empleado.baseSalary,
      commissionPercentage: empleado.commission,
      /** Servicios netos: la base sobre la que se paga comision. */
      totalSalesGenerated: serviciosNetos,
      productosVendidos,
      vendidoTotal,
      commissionPay: comision,
      metricas,
      bonos,
      bonosTotal,
      totalPay: empleado.baseSalary + comision + bonosTotal,
      sales: detalle,
    };
  });

  return {
    startDate: inicio.toISOString(),
    endDate: fin.toISOString(),
    payrollData: nomina,
  };
}

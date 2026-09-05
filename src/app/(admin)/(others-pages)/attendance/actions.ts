"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { esRetardo } from "@/lib/asistencia";
import { aTextoFecha, deTextoFecha, rangoSemana } from "@/lib/periodo";

/** El horario que le toca a un empleado ese dia de la semana. */
function horarioDelDia(emp: { workScheduleStartWeekday: string | null; workScheduleEndWeekday: string | null; workScheduleStartSaturday: string | null; workScheduleEndSaturday: string | null }, diaSemana: number) {
  if (diaSemana === 6) {
    return { entrada: emp.workScheduleStartSaturday || "", salida: emp.workScheduleEndSaturday || "" };
  }
  if (diaSemana > 0 && diaSemana < 6) {
    return { entrada: emp.workScheduleStartWeekday || "", salida: emp.workScheduleEndWeekday || "" };
  }
  // Domingo: sin horario cargado.
  return { entrada: "", salida: "" };
}

export async function getAttendanceByDate(dateStr: string) {
  const business = await requireBusiness();
  if (!business) throw new Error("No business found");

  const selectedDate = deTextoFecha(dateStr);
  const jsDay = selectedDate.getDay(); // 0 = domingo, 6 = sabado

  const negocio = await prisma.business.findUnique({
    where: { id: business.id },
    select: { lateToleranceMinutes: true, weekStartDay: true },
  });
  const tolerancia = negocio?.lateToleranceMinutes ?? 10;

  const employees = await prisma.employee.findMany({
    where: { businessId: business.id, active: true },
    include: { user: true },
  });

  const attendances = await prisma.attendance.findMany({
    where: { businessId: business.id, date: selectedDate },
  });

  // Resumen de la semana que contiene el dia consultado, con el dia de corte
  // del salon. Es lo que despues va a leer el bono de puntualidad.
  const resumen = await resumenDeSemana(business.id, selectedDate, negocio?.weekStartDay ?? 1);

  const records = employees.map((emp) => {
    const entry = attendances.find((a) => a.employeeId === emp.id);
    const { entrada: expectedIn, salida: expectedOut } = horarioDelDia(emp, jsDay);
    const semana = resumen.get(emp.id) ?? { retardos: 0, faltas: 0, justificadas: 0, capturados: 0, esperados: 0 };

    if (entry) {
      return {
        ...entry,
        employeeName: `${emp.user.name} ${emp.user.lastName}`,
        hasRecord: true,
        expectedIn,
        expectedOut,
        isAbsent: entry.status === "ABSENT",
        isExcused: entry.status === "EXCUSED",
        semana,
      };
    }

    // Sin registro: se precarga el horario para que un dia normal no haya nada
    // que escribir. Queda marcado como SCHEDULE hasta que alguien lo cambie.
    return {
      id: null,
      employeeId: emp.id,
      employeeName: `${emp.user.name} ${emp.user.lastName}`,
      date: selectedDate,
      status: "PRESENT",
      checkInTime: expectedIn,
      checkOutTime: expectedOut,
      notes: "",
      source: "SCHEDULE",
      sourceRef: null,
      hasRecord: false,
      expectedIn,
      expectedOut,
      isAbsent: false,
      isExcused: false,
      semana,
    };
  });

  return { toleranceMinutes: tolerancia, records };
}

/**
 * Retardos, faltas y dias capturados de cada empleado en la semana.
 *
 * `esperados` cuenta los dias de la semana que ya pasaron y en los que el
 * empleado tenia horario. `capturados` cuenta los que ademas tienen una hora
 * que alguien confirmo -source distinto de SCHEDULE- o una falta marcada. La
 * diferencia entre los dos es lo que el bono de puntualidad NO va a dar por
 * bueno: un dia que nadie toco no prueba que la persona llego a tiempo.
 */
async function resumenDeSemana(businessId: string, fecha: Date, diaDeCorte: number) {
  const { inicio, fin } = rangoSemana(fecha, diaDeCorte);

  const [negocio, empleados, registros] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { lateToleranceMinutes: true } }),
    prisma.employee.findMany({
      where: { businessId, active: true },
      select: {
        id: true,
        workScheduleStartWeekday: true, workScheduleEndWeekday: true,
        workScheduleStartSaturday: true, workScheduleEndSaturday: true,
      },
    }),
    prisma.attendance.findMany({
      where: { businessId, date: { gte: inicio, lte: fin } },
    }),
  ]);

  const tolerancia = negocio?.lateToleranceMinutes ?? 10;
  const hoy = new Date();
  hoy.setHours(23, 59, 59, 999);

  const resumen = new Map<string, { retardos: number; faltas: number; justificadas: number; capturados: number; esperados: number }>();

  for (const emp of empleados) {
    let retardos = 0, faltas = 0, justificadas = 0, capturados = 0, esperados = 0;

    for (let i = 0; i < 7; i++) {
      const dia = new Date(inicio);
      dia.setDate(inicio.getDate() + i);
      if (dia > hoy) break; // los dias que no han llegado no se cuentan

      const { entrada } = horarioDelDia(emp, dia.getDay());
      if (!entrada) continue; // ese dia no trabaja
      esperados++;

      const reg = registros.find(
        (r) => r.employeeId === emp.id && aTextoFecha(new Date(r.date)) === aTextoFecha(dia)
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

export async function upsertManyAttendances(records: any[], dateStr: string) {
  const business = await requireBusiness();
  if (!business) throw new Error("No business found");

  const selectedDate = deTextoFecha(dateStr);
  const jsDay = selectedDate.getDay();

  const negocio = await prisma.business.findUnique({
    where: { id: business.id },
    select: { lateToleranceMinutes: true },
  });
  const tolerancia = negocio?.lateToleranceMinutes ?? 10;

  // El horario programado se relee de la base y no se toma del cliente: es lo
  // que decide si hubo retardo, y no puede depender de lo que llegue en el
  // formulario.
  const empleados = await prisma.employee.findMany({
    where: { businessId: business.id, active: true },
    select: {
      id: true,
      workScheduleStartWeekday: true, workScheduleEndWeekday: true,
      workScheduleStartSaturday: true, workScheduleEndSaturday: true,
    },
  });

  for (const record of records) {
    const { employeeId, isAbsent, isExcused, checkInTime, checkOutTime, notes } = record;

    const emp = empleados.find((e) => e.id === employeeId);
    if (!emp) continue;
    const { entrada: programada } = horarioDelDia(emp, jsDay);

    // PRESENT o LATE lo decide la hora, no quien captura.
    let finalStatus: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" = "PRESENT";
    if (isAbsent) finalStatus = "ABSENT";
    else if (isExcused) finalStatus = "EXCUSED";
    else if (esRetardo(checkInTime, programada, tolerancia)) finalStatus = "LATE";

    // Marcar falta o justificada es una decision de una persona, y escribir
    // una hora distinta a la programada tambien. Si la hora quedo igual a la
    // programada, nadie confirmo nada: sigue siendo SCHEDULE.
    const source: "SCHEDULE" | "MANUAL" =
      isAbsent || isExcused || (checkInTime || "") !== (programada || "") ? "MANUAL" : "SCHEDULE";

    const data = {
      status: finalStatus,
      checkInTime: isAbsent ? null : checkInTime,
      checkOutTime: isAbsent ? null : checkOutTime,
      notes,
      source,
    };

    await prisma.attendance.upsert({
      where: {
        businessId_employeeId_date: {
          businessId: business.id,
          employeeId,
          date: selectedDate,
        },
      },
      update: data,
      create: { businessId: business.id, employeeId, date: selectedDate, ...data },
    });
  }

  revalidatePath("/attendance");
  return { success: true };
}

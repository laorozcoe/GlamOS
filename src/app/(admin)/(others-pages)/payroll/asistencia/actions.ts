"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { esRetardo, horarioDelDia } from "@/lib/asistencia";
import { deTextoFecha, rangoSemana } from "@/lib/periodo";
import { resumenAsistencia } from "@/lib/nomina";

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
  const { inicio, fin } = rangoSemana(selectedDate, negocio?.weekStartDay ?? 1);
  const resumen = await resumenAsistencia(business.id, inicio, fin);

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

  revalidatePath("/payroll/asistencia");
  return { success: true };
}

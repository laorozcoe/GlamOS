"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

export async function getAttendanceByDate(dateStr: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const [year, month, day] = dateStr.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const jsDay = selectedDate.getDay(); // 0 is Sunday, 1 is Monday, 6 is Saturday

  // 1. Obtener empleados activos
  const employees = await prisma.employee.findMany({
    where: {
      businessId: business.id,
      active: true
    },
    include: { user: true }
  });

  // 2. Obtener asistencias ya guardadas para este día
  const attendances = await prisma.attendance.findMany({
    where: {
      businessId: business.id,
      date: selectedDate
    }
  });

  // 3. Crear el listado combinado
  const attendanceList = employees.map((emp: any) => {
    // Buscar la asistencia de este empleado el día de hoy
    const entry = attendances.find((a: any) => a.employeeId === emp.id);

    // Determinar la hora sugerida según L-V o Sábado
    let expectedIn = "";
    let expectedOut = "";
    if (jsDay === 6) { // Saturday
      expectedIn = emp.workScheduleStartSaturday || "";
      expectedOut = emp.workScheduleEndSaturday || "";
    } else if (jsDay > 0 && jsDay < 6) { // Monday-Friday
      expectedIn = emp.workScheduleStartWeekday || "";
      expectedOut = emp.workScheduleEndWeekday || "";
    }

    if (entry) {
      return {
        ...entry,
        employeeName: `${emp.user.name} ${emp.user.lastName}`,
        hasRecord: true,
        expectedIn,
        expectedOut,
        isAbsent: entry.status === "ABSENT",
        isExcused: entry.status === "EXCUSED",
      };
    }

    return {
      id: null,
      employeeId: emp.id,
      employeeName: `${emp.user.name} ${emp.user.lastName}`,
      date: selectedDate,
      status: "PRESENT",
      checkInTime: expectedIn,
      checkOutTime: expectedOut,
      notes: "",
      hasRecord: false,
      expectedIn,
      expectedOut,
      isAbsent: false,
      isExcused: false,
    };
  });

  return attendanceList;
}

export async function upsertManyAttendances(records: any[], dateStr: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const [year, month, day] = dateStr.split("-").map(Number);
  const selectedDate = new Date(year, month - 1, day);

  for (const record of records) {
    const { employeeId, isAbsent, isExcused, checkInTime, checkOutTime, notes } = record;

    let finalStatus = "PRESENT";
    if (isAbsent) finalStatus = "ABSENT";
    else if (isExcused) finalStatus = "EXCUSED";
    // We could calculate "LATE" here by comparing checkInTime with expectedIn, but usually PRESENT is fine. 

    const existing = await prisma.attendance.findUnique({
      where: {
        businessId_employeeId_date: {
          businessId: business.id,
          employeeId: employeeId,
          date: selectedDate
        }
      }
    });

    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: finalStatus as any,
          checkInTime: isAbsent ? null : checkInTime,
          checkOutTime: isAbsent ? null : checkOutTime,
          notes
        }
      });
    } else {
      await prisma.attendance.create({
        data: {
          businessId: business.id,
          employeeId,
          date: selectedDate,
          status: finalStatus as any,
          checkInTime: isAbsent ? null : checkInTime,
          checkOutTime: isAbsent ? null : checkOutTime,
          notes
        }
      });
    }
  }

  revalidatePath("/attendance");
  return { success: true };
}

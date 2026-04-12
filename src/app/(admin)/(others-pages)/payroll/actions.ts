"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";

export async function getPayrollData(weekDateISO: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const d = new Date(weekDateISO);

  // Establecer a la media noche del Domingo previo (o el mismo día si es domingo)
  const startDate = new Date(d);
  startDate.setDate(d.getDate() - d.getDay());
  startDate.setHours(0, 0, 0, 0);

  // Establecer hasta el último minuto del Sábado siguiente
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  // Empleados activos
  const employees = await prisma.employee.findMany({
    where: {
      businessId: business.id,
      active: true,
      user: { active: true },
    },
    include: {
      user: true,
    },
  });

  // Ventas completadas en este periodo
  const sales = await prisma.sale.findMany({
    where: {
      businessId: business.id,
      status: "COMPLETED",
      active: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: true,
      client: true,
    },
    orderBy: { createdAt: "desc" }
  });

  const payrollData = employees.map((employee: any) => {
    const employeeSales = sales.filter((s: any) => s.employeeId === employee.id);

    let totalSalesGenerated = 0;

    employeeSales.forEach((s: any) => {
      totalSalesGenerated += s.total;
    });

    const commissionPay = totalSalesGenerated * (employee.commission / 100);
    const totalPay = employee.baseSalary + commissionPay;

    return {
      employeeId: employee.id,
      name: `${employee.user.name} ${employee.user.lastName}`,
      role: employee.user.role,
      baseSalary: employee.baseSalary,
      commissionPercentage: employee.commission,
      totalSalesGenerated,
      commissionPay,
      totalPay,
      sales: employeeSales,
    };
  });

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    payrollData,
  };
}

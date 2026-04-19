"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";

export async function getPayrollData(startDateISO: string, endDateISO: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const startDate = new Date(startDateISO);
  const endDate = new Date(endDateISO);

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

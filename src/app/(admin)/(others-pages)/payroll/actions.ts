"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";

export async function getPayrollData(startDateISO: string, endDateISO: string) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
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

    let totalSalesGenerated = 0; // Solo para comisiones (servicios)
    let totalProductsGenerated = 0; // Para reportes (productos)

    employeeSales.forEach((s: any) => {
      // Sumamos solo el valor de los servicios (no productos)
      const serviceItems = (s.items || []).filter((item: any) => item.productId === null);
      const productItems = (s.items || []).filter((item: any) => item.productId !== null);
      
      const servicesTotal = serviceItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      const productsTotal = productItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      
      let ticketServiceRevenue = servicesTotal;
      if ((s.discount > 0 || s.promotionDiscount > 0) && servicesTotal > 0) {
        const totalDiscount = (s.discount || 0) + (s.promotionDiscount || 0);
        const subtotal = servicesTotal + productsTotal;
        const discountRatio = subtotal > 0 ? (servicesTotal / subtotal) : 1;
        ticketServiceRevenue -= (totalDiscount * discountRatio);
      }

      totalSalesGenerated += ticketServiceRevenue;
      totalProductsGenerated += productsTotal;
    });

    const commissionPay = totalSalesGenerated * (employee.commission / 100);
    const totalPay = employee.baseSalary + commissionPay;

    return {
      employeeId: employee.id,
      name: `${employee.user.name} ${employee.user.lastName}`,
      role: employee.role,
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

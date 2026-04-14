"use server";
import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

export async function getEmployeesWithPermissions() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const employees = await prisma.employee.findMany({
    where: {
      businessId: business.id,
      active: true,
      user: {
        active: true,
      },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  return employees;
}

export async function updateEmployeePermissions(employeeId: string, canCreateAppointments: boolean) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  await prisma.employee.update({
    where: { id: employeeId, businessId: business.id },
    data: { canCreateAppointments },
  });

  revalidatePath("/permissions");
  return { success: true };
}

"use server";
import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getEmployeesWithPermissions() {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
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

export async function updateEmployeePermissions(
  employeeId: string,
  data: { canCreateAppointments?: boolean; canViewClientData?: boolean }
) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);
  if (!business) throw new Error("No business found");

  await prisma.employee.update({
    where: { id: employeeId, businessId: business.id },
    data,
  });

  revalidatePath("/permissions");
  return { success: true };
}

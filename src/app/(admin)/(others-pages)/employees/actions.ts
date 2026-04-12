"use server";

import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { hashPassword } from "@/lib/hashPassword";
import { revalidatePath } from "next/cache";

export async function getEmployees() {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const users = await prisma.user.findMany({
    where: { 
      businessId: business.id,
      active: true // Sólo usuarios activos
    },
    include: {
      employee: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

export async function createEmployee(data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const { name, lastName, username, email, password, role, commission, baseSalary, phone, hasPayroll } = data;

  const hashedPassword = await hashPassword(password);

  const generatedUsername = username || `${name.toLowerCase().replace(/\s/g, "")}${Math.floor(Math.random() * 100)}`;
  
  const user = await prisma.user.create({
    data: {
      businessId: business.id,
      name,
      lastName,
      username: generatedUsername.toLowerCase(),
      email,
      password: hashedPassword,
      role: role || "RECEPTION",
      phone,
    },
  });

  // Better Auth necesita un Account para el inicio de sesión por credenciales
  await prisma.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: email || user.username,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
    }
  });

  if (hasPayroll) {
    await prisma.employee.create({
      data: {
        businessId: business.id,
        userId: user.id,
        phone,
        commission: Number(commission) || 0,
        baseSalary: Number(baseSalary) || 0,
      },
    });
  }

  revalidatePath("/employees");
  return user;
}

export async function updateEmployee(userId: string, data: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const { name, lastName, email, phone, role, commission, baseSalary, password, hasPayroll } = data;

  const updateData: any = {
    name,
    lastName,
    email,
    phone,
    role,
  };

  if (password && password.trim() !== "") {
    const hashed = await hashPassword(password);
    updateData.password = hashed;
    
    // Actualizamos también la cuenta de Better Auth para sincronizar la contraseña
    await prisma.account.updateMany({
      where: { userId: userId, providerId: "credential" },
      data: { password: hashed },
    });
  }

  const user = await prisma.user.update({
    where: { id: userId, businessId: business.id },
    data: updateData,
  });

  if (hasPayroll) {
    const existingEmployee = await prisma.employee.findUnique({ where: { userId } });
    if (existingEmployee) {
      await prisma.employee.update({
        where: { userId },
        data: {
          phone,
          commission: Number(commission) || 0,
          baseSalary: Number(baseSalary) || 0,
        },
      });
    } else {
      await prisma.employee.create({
        data: {
          businessId: business.id,
          userId,
          phone,
          commission: Number(commission) || 0,
          baseSalary: Number(baseSalary) || 0,
        },
      });
    }
  } else {
    // Si deshabilitó la nómina, podríamos opcionalmente hacer soft delete sobre la tabla Employee, 
    // pero si eligió quitarlo, simplemente lo inactivamos para que no salga en la nómina.
    const existingEmployee = await prisma.employee.findUnique({ where: { userId } });
    if (existingEmployee && existingEmployee.active) {
       await prisma.employee.update({
           where: { userId },
           data: { active: false },
       });
    }
    if (existingEmployee && !existingEmployee.active && hasPayroll===false) {
      // Nothing needed, it's already inactive. Although wait, if hasPayroll is false, we already disabled it.
    } else if (existingEmployee && !existingEmployee.active && hasPayroll===true) {
        // En caso de que se volviera a activar
    }
  }

  // Refinar la lógica de reactivación
  if (hasPayroll) {
     await prisma.employee.updateMany({
         where: { userId },
         data: { active: true },
     });
  }

  revalidatePath("/employees");
  return user;
}

export async function deleteEmployee(userId: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  await prisma.user.update({
    where: { id: userId, businessId: business.id },
    data: { active: false },
  });

  // Soft delete del employee as well if it exists
  const employee = await prisma.employee.findUnique({ where: { userId } });
  if (employee) {
    await prisma.employee.update({
      where: { userId },
      data: { active: false },
    });
  }

  revalidatePath("/employees");
}

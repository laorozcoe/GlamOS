"use server";

import prisma from "@/lib/prisma2";
import { requireBusiness } from "@/lib/session";
import { hashPassword } from "@/lib/hashPassword";
import { revalidatePath } from "next/cache";

/**
 * "Empleado" en esta pantalla = la MEMBRESIA de una persona en este salón
 * (una fila de Employee), no su identidad global.
 *
 * La identidad (User) es única por correo en todo el sistema y se comparte
 * entre salones. El rol, el sueldo, la comisión y el horario son de la
 * membresía, así que la misma persona puede ganar distinto en cada salón sin
 * que se toquen los historiales.
 *
 * Hacia la UI se devuelve la forma de siempre -un usuario con `.role` y
 * `.employee`- para no obligar a reescribir la pantalla.
 */
function toUserShape(membership: any) {
  const { user, ...employee } = membership;
  return {
    ...user,
    role: employee.role,
    phone: employee.phone ?? user.phone,
    // `employee` presente = tiene nómina. Antes eso se representaba con la
    // ausencia de la fila; ahora todas las membresías existen y lo distingue
    // `bookable`.
    employee: employee.bookable ? employee : null,
  };
}

export async function getEmployees() {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);

  const memberships = await prisma.employee.findMany({
    where: {
      businessId: business.id,
      user: { active: true },
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map(toUserShape);
}

export async function createEmployee(data: any) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);

  const {
    name, lastName, username, email, password, role, commission, baseSalary, phone, hasPayroll,
    workScheduleStartWeekday, workScheduleEndWeekday, workScheduleStartSaturday, workScheduleEndSaturday,
  } = data;

  // ¿La persona ya existe en el sistema? Puede venir de otro salón: en ese
  // caso se reutiliza su identidad y solo se le agrega la membresía.
  let user = email
    ? await prisma.user.findUnique({ where: { email } })
    : null;

  if (!user) {
    const hashed = await hashPassword(password);
    const generatedUsername =
      username || `${name.toLowerCase().replace(/\s/g, "")}${Math.floor(Math.random() * 100)}`;

    user = await prisma.user.create({
      data: {
        name,
        lastName,
        username: generatedUsername.toLowerCase(),
        email,
        password: hashed,
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
        password: hashed,
      },
    });
  }
  // Si el usuario ya existía NO se toca su contraseña: agregar a alguien a tu
  // salón no puede cambiarle la credencial con la que entra a otro.

  const perfil = {
    phone,
    commission: Number(commission) || 0,
    baseSalary: Number(baseSalary) || 0,
    workScheduleStartWeekday,
    workScheduleEndWeekday,
    workScheduleStartSaturday,
    workScheduleEndSaturday,
    role: role || "RECEPTION",
    bookable: !!hasPayroll,
    active: true,
  };

  await prisma.employee.upsert({
    where: { businessId_userId: { businessId: business.id, userId: user.id } },
    create: { businessId: business.id, userId: user.id, ...perfil },
    update: perfil,
  });

  revalidatePath("/employees");
  return user;
}

export async function updateEmployee(userId: string, data: any) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);

  // La membresía en ESTE salón es la autorización: sin ella no se puede tocar
  // a esa persona, aunque exista en el sistema.
  const membership = await prisma.employee.findUnique({
    where: { businessId_userId: { businessId: business.id, userId } },
    select: { id: true },
  });
  if (!membership) throw new Error("Esa persona no pertenece a este salón");

  const {
    name, lastName, email, phone, role, commission, baseSalary, password, hasPayroll,
    workScheduleStartWeekday, workScheduleEndWeekday, workScheduleStartSaturday, workScheduleEndSaturday,
  } = data;

  if (password && password.trim() !== "") {
    const hashed = await hashPassword(password);

    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    await prisma.account.updateMany({
      where: { userId, providerId: "credential" },
      data: { password: hashed },
    });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name, lastName, email, phone },
    });
  } catch (e: any) {
    // El correo es único en todo el sistema: es la credencial de acceso.
    if (e?.code === "P2002") {
      throw new Error("Ese correo ya lo usa otra persona en el sistema");
    }
    throw e;
  }

  await prisma.employee.update({
    where: { id: membership.id },
    data: {
      role: role || "RECEPTION",
      phone,
      commission: Number(commission) || 0,
      baseSalary: Number(baseSalary) || 0,
      workScheduleStartWeekday,
      workScheduleEndWeekday,
      workScheduleStartSaturday,
      workScheduleEndSaturday,
      bookable: !!hasPayroll,
      active: true,
    },
  });

  revalidatePath("/employees");
  return { id: userId };
}

export async function deleteEmployee(userId: string) {
  const business = await requireBusiness(["ADMIN", "RECEPTION"]);

  // Se da de baja SOLO la membresía en este salón. La identidad global y las
  // membresías en otros salones no se tocan: dar de baja a alguien aquí no
  // puede sacarlo del salón de al lado.
  await prisma.employee.updateMany({
    where: { businessId: business.id, userId },
    data: { active: false },
  });

  revalidatePath("/employees");
}

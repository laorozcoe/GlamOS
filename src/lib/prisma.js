'use server'

import prisma from '@/lib/prisma2'
import { hashPassword } from '@/lib/hashPassword'
import { revalidatePath } from "next/cache";
import { randomUUID } from 'crypto'; // Para generar los IDs de Account
import { assertBusinessId, requireSession } from '@/lib/session';
// import { auth } from "@/lib/auth"; // Tu configuración de Auth.js

//--------------------------------------------------------------------------------
//-------------------------Appointment-------------------------------------
//--------------------------------------------------------------------------------

export async function createAppointment(payload) {
    payload = { ...payload, businessId: await assertBusinessId(payload?.businessId) };
    // const session = await auth();
    // if (!session?.user) throw new Error("No autenticado");

    // Validación: requerir al menos un servicio real
    if (!payload.services || payload.services.length === 0) {
        throw new Error("Se requiere al menos un servicio para crear una cita");
    }

    // Validación adicional: asegurar que los servicios tengan serviceId válido si no son extras manuales
    // Se comenta porque rompe los "Servicios Extras" manuales que tienen serviceId en null o undefined
    // const invalidServices = payload.services.filter(s => !s.serviceId && !s.isCustom);
    // if (invalidServices.length > 0) {
    //     throw new Error("Todos los servicios deben tener un ID válido");
    // }

    const appointment = await prisma.appointment.create({
        data: {
            businessId: payload.businessId,
            employeeId: payload.employeeId,
            title: payload.title,
            start: payload.start,
            end: payload.end,
            guestName: payload.guestName,
            guestPhone: payload.guestPhone,
            status: payload.status,
            paymentStatus: payload.paymentStatus,
            totalAmount: payload.totalAmount,
            notes: payload.notes,
            services: {
                create: payload.services.map((s) => ({
                    serviceId: s.serviceId,
                    price: s.price,
                })),
            },
        },
    });

    revalidatePath("/calendar"); // <-- Pon aquí la ruta de tu página de calendario
    return appointment
}

export async function getAppointmentPrisma(businessId, id) {
    businessId = await assertBusinessId(businessId);
    const appointment = await prisma.appointment.findFirst({
        where: {
            businessId: businessId,
            id: id,
            active: true
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    })

    return appointment
}

export async function getAppointmentsPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    const appointment = await prisma.appointment.findMany({
        where: { businessId: businessId, active: true },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    });

    return appointment
}

export async function getAppointmentsByDatePrisma(businessId, start) {
    businessId = await assertBusinessId(businessId);

    // Forzamos el inicio del día con el desfase de UTC-6
    const startDate = new Date(`${start}T00:00:00.000-06:00`);

    // Forzamos el fin del día con el desfase de UTC-6
    const endDate = new Date(`${start}T23:59:59.999-06:00`);


    const appointment = await prisma.appointment.findMany({
        where: { businessId: businessId, start: { gte: startDate }, end: { lte: endDate }, active: true },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            client: true,
            services: {
                include: {
                    service: true,
                    appointmentExtras: {
                        include: {
                            extra: true,
                        },
                    },
                },
            },
        },
    });

    return appointment
}

export async function updateAppointment(payload, appointmentId) {
    const sessionBusinessId = await assertBusinessId(payload?.businessId);
    // Validación básica
    if (!appointmentId) throw new Error("Se requiere el ID de la cita para actualizar");

    // Validación: requerir al menos un servicio real
    if (!payload.services || payload.services.length === 0) {
        throw new Error("Se requiere al menos un servicio para actualizar una cita");
    }

    // Validación adicional: asegurar que los servicios tengan serviceId válido si no son extras manuales
    // Se comenta porque rompe los "Servicios Extras" manuales que tienen serviceId en null o undefined
    // const invalidServices = payload.services.filter(s => !s.serviceId && !s.isCustom);
    // if (invalidServices.length > 0) {
    //     throw new Error("Todos los servicios deben tener un ID válido");
    // }

    await prisma.appointment.update({
        where: {
            // El businessId es obligatorio en el where: sin el, cualquier
            // usuario autenticado podia editar la cita de otro negocio.
            id: appointmentId, businessId: sessionBusinessId, active: true
        },
        data: {
            // 1. Actualizamos los datos planos de la Cita
            businessId: sessionBusinessId,
            employeeId: payload.employeeId, // Ojo: asegúrate que tu payload traiga el objeto o el string directo
            title: payload.title,
            start: payload.start,
            end: payload.end,
            status: payload.status,
            paymentStatus: payload.paymentStatus,
            totalAmount: payload.totalAmount,
            guestName: payload.guestName,
            guestPhone: payload.guestPhone,
            clientId: payload.clientId,
            notes: payload.notes,
            // 2. LA MAGIA: Borrar todo y crear de nuevo
            services: {
                // Esto borra TODOS los registros en la tabla AppointmentService 
                // que estén relacionados con este appointmentId.
                deleteMany: {},

                // Inmediatamente después, crea los nuevos que vienen en el payload
                create: payload.services.map((s) => ({
                    serviceId: s.serviceId,
                    price: s.price,
                })),
            },
        },
    });

    revalidatePath("/calendar");
}

export async function deleteAppointmentPrisma(appointmentId) {
    const { business } = await requireSession();
    // Validación básica
    if (!appointmentId) throw new Error("Se requiere el ID de la cita para eliminar");

    await prisma.appointment.update({
        where: {
            id: appointmentId,
            // Sin businessId cualquier usuario autenticado podia borrar la
            // cita de otro negocio conociendo solo su id.
            businessId: business.id,
            active: true
        },
        data: {
            active: false
        }
    });

    revalidatePath("/calendar");
}

//--------------------------------------------------------------------------------
//-------------------------Seed-------------------------------------
//--------------------------------------------------------------------------------

export async function seed() {
    await requireSession(["ADMIN"]);
    return await prisma.business.create({
        data: {
            name: "Evora Salon",
            slug: "evorasalon",
            phone: "",
            email: "",
            address: "",
        },
    })
}

//--------------------------------------------------------------------------------
//-------------------------Business-------------------------------------
//--------------------------------------------------------------------------------

// getBusinessPrisma se movio a src/lib/getBusiness.js: este archivo es
// "use server", por lo que exportarla la convertia en un Server Action publico
// que devolvia el registro completo del negocio -tokens de MercadoPago
// incluidos- a cualquiera que pasara un slug.

//--------------------------------------------------------------------------------
//-------------------------ServiceCategory-------------------------------------
//--------------------------------------------------------------------------------


export async function createServiceCategoryPrisma(businessId, name, order, active) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const serviceCategory = await prisma.serviceCategory.create({
        data: {
            businessId,
            name,
            order,
            active
        },
    })

    return serviceCategory
}

export async function getServiceCategoryPrisma(businessId, name) {
    businessId = await assertBusinessId(businessId);
    const serviceCategory = await prisma.serviceCategory.findFirst({
        where: {
            businessId: businessId,
            name: name,
            active: true,
        },
    })

    return serviceCategory
}

export async function getServicesCategoriesPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    const serviceCategories = await prisma.serviceCategory.findMany({
        where: {
            businessId: businessId,
            active: true,
        },
    })

    return serviceCategories
}

export async function updateServiceCategoryPrisma(id, businessId, name, order, active) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const serviceCategory = await prisma.serviceCategory.update({
        where: {
            id: id,
            businessId: businessId,
            active: true,
        },
        data: {
            name,
            order,
            active
        },
    })

    return serviceCategory
}

export async function deleteServiceCategoryPrisma(id, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const serviceCategory = await prisma.serviceCategory.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return serviceCategory
}


//--------------------------------------------------------------------------------
//-------------------------Service-------------------------------------
//--------------------------------------------------------------------------------

export async function createServicePrisma(businessId, categoryId, name, description, descriptionTicket, duration, price) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const service = await prisma.service.create({
        data: {
            businessId,
            categoryId,
            name,
            description,
            descriptionTicket,
            duration,
            price
        },
    })

    return service
}

export async function getServicePrisma(businessId, name) {
    businessId = await assertBusinessId(businessId);

    const service = await prisma.service.findFirst({
        where: {
            businessId: businessId,
            name: name,
            active: true
        },
    })

    return service
}

export async function getServicesPrisma(businessId) {
    businessId = await assertBusinessId(businessId);

    const services = await prisma.service.findMany({
        where: {
            businessId: businessId,
            active: true
        },
    })

    return services
}

export async function getServicesByCategoryPrisma(businessId, categoryId) {
    businessId = await assertBusinessId(businessId);

    const servicesCategories = await prisma.service.findMany({
        where: {
            businessId: businessId,
            categoryId: categoryId,
            active: true
        },
    })

    return servicesCategories
}

export async function updateServicePrisma(id, businessId, categoryId, name, description, descriptionTicket, duration, price) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const service = await prisma.service.update({
        where: {
            id: id,
            businessId: businessId,
            categoryId: categoryId,
            active: true
        },
        data: {
            name,
            description,
            descriptionTicket,
            duration,
            price
        },
    })

    return service
}

export async function deleteServicePrisma(id, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const service = await prisma.service.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return service
}

//--------------------------------------------------------------------------------
//-------------------------Employee-------------------------------------
//--------------------------------------------------------------------------------
// model Employee {
//   id         String   @id @default(uuid())
//   businessId String
//   userId     String   @unique
//   phone      String?
//   bio        String?
//   commission Float    @default(0.0)
//   rating     Float    @default(0.0)
//   active     Boolean  @default(true)
//   createdAt  DateTime @default(now())

//   business     Business      @relation(fields: [businessId], references: [id])
//   user         User          @relation(fields: [userId], references: [id])
//   appointments Appointment[]
//   reviews      Review[]
// }

export async function createEmployeePrisma(businessId, userId, phone, bio, commission, rating) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);

    // commission = parseFloat(commission);
    // rating = parseFloat(rating);

    // if (isNaN(commission) || isNaN(rating)) {
    //     throw new Error("Commission o rating inválido");
    // }

    // Upsert porque (businessId, userId) es único: agregar dos veces a la
    // misma persona al mismo salón actualiza su membresía en vez de fallar.
    const employee = await prisma.employee.upsert({
        where: { businessId_userId: { businessId, userId } },
        create: { businessId, userId, phone, bio, commission, rating },
        update: { phone, bio, commission, rating, active: true },
    })

    return employee
}

export async function getEmployeePrisma(businessId, userId) {
    businessId = await assertBusinessId(businessId);
    const employee = await prisma.employee.findFirst({
        where: {
            businessId: businessId,
            userId: userId,
            active: true
        },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    })

    return employee
}

export async function getEmployeesPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    // const employees = await prisma.employee.findMany({
    //     where: {
    //         businessId: businessId,
    //     },
    // })

    const employees = await prisma.employee.findMany({
        where: {
            businessId,
            active: true,
            // Solo el personal que se puede agendar. Las membresías puramente
            // administrativas (un dueño que no atiende) quedan fuera.
            bookable: true,
        },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
        },
    })
    return employees

}

export async function updateEmployeePrisma(id, businessId, userId, phone, bio, commission, rating) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const employee = await prisma.employee.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            userId,
            phone,
            bio,
            commission,
            rating
        },
    })

    return employee
}

export async function deleteEmployeePrisma(id, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const employee = await prisma.employee.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return employee
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createUserPrisma(businessId, name, lastName, username, email, password, role) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const passwordHash = await hashPassword(password)

    // La identidad es global; la pertenencia al salón es la membresía.
    const user = await prisma.user.create({
        data: {
            email,
            name,
            username,
            lastName,
            password: passwordHash,
        },
    })

    await prisma.employee.create({
        data: {
            businessId,
            userId: user.id,
            role: role || "RECEPTION",
            bookable: false,
        },
    })

    return user
}

export async function getUserPrisma(username, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);

    const user = await prisma.user.findFirst({
        where: {
            username: username,
            active: true,
            memberships: { some: { businessId, active: true } },
        },
    })

    return user
}

export async function updateUserPrisma(id, businessId, name, username, lastName, password, role) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    // La pertenencia al salón es la autorización: sin membresía no se toca a
    // esa persona, aunque exista en el sistema.
    const membership = await prisma.employee.findUnique({
        where: { businessId_userId: { businessId, userId: id } },
        select: { id: true },
    })
    if (!membership) throw new Error("Esa persona no pertenece a este salón")

    const user = await prisma.user.update({
        where: { id, active: true },
        data: {
            name,
            lastName,
            username,
            password,
        },
    })

    // El rol vive en la membresía de este salón.
    if (role) {
        await prisma.employee.update({ where: { id: membership.id }, data: { role } })
    }

    return user
}

export async function deleteUserPrisma(id, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    // Se da de baja SOLO la membresía en este salón. Borrar la identidad
    // global sacaría a la persona de los demás salones y arrastraría su
    // historial.
    return await prisma.employee.updateMany({
        where: { businessId, userId: id },
        data: { active: false },
    })
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createClientPrisma(businessId, name, phone, email, notes, employeeId) {
    businessId = await assertBusinessId(businessId);

    if (name == '' || phone == '') return
    // 1. VALIDACIÓN: Buscar si ya existe un cliente con ese teléfono en ese negocio
    const existingClient = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone,
            active: true
        }
    });

    // 2. DECISIÓN: Si existe, lo retornamos (o puedes lanzar un error)
    if (existingClient) {
        // Opción A: Retornar el existente (útil para "Get or Create")
        console.log("Cliente ya existía, retornando el existente.");
        return existingClient;

        // Opción B: Si prefieres que de error, descomenta esto:
        // throw new Error("El cliente ya está registrado en este negocio.");
    }

    // 3. CREACIÓN: Si no existe, lo insertamos
    const newClient = await prisma.client.create({
        data: {
            businessId,
            name,
            phone,
            email,
            notes,
            employeeId
        },
    });

    return newClient;
}

export async function getClientPrisma(businessId, phone) {
    businessId = await assertBusinessId(businessId);
    const client = await prisma.client.findFirst({
        where: {
            businessId: businessId,
            phone: phone,
            active: true
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
        }
    })

    return client
}

export async function getClientsPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    const clients = await prisma.client.findMany({
        where: {
            businessId: businessId,
            active: true
        },
        orderBy: {
            name: 'asc' // Ordena A-Z basándose en el nombre del usuario anidado
        },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
        }
    })

    return clients
}

export async function updateClientPrisma(id, businessId, name, phone, email, notes, employeeId) {
    businessId = await assertBusinessId(businessId);
    const client = await prisma.client.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            name,
            phone,
            email,
            notes,
            employeeId
        },
    })

    return client
}

export async function deleteClientPrisma(id, businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const client = await prisma.client.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return client
}

//--------------------------------------------------------------------------------
//-------------------------User-------------------------------------
//--------------------------------------------------------------------------------

export async function createPaymentPrisma(businessId, appointmentId, amount, method, status, externalId) {
    businessId = await assertBusinessId(businessId);
    const payment = await prisma.payment.create({
        data: {
            businessId,
            appointmentId,
            amount,
            method,
            status,
            externalId
        },
    })

    return payment
}

export async function getPaymentPrisma(businessId, appointmentId) {
    businessId = await assertBusinessId(businessId);
    const payment = await prisma.payment.findFirst({
        where: {
            appointmentId: appointmentId,
            businessId: businessId,
            active: true
        },
    })

    return payment
}

export async function getPaymentsPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    const payments = await prisma.payment.findMany({
        where: {
            businessId: businessId,
            active: true
        },
    })

    return payments
}

export async function updatePaymentPrisma(businessId, id, amount, method, status, externalId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const payment = await prisma.payment.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            amount,
            method,
            status,
            externalId
        },
    })

    return payment
}

export async function deletePaymentPrisma(businessId, id) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const payment = await prisma.payment.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return payment
}

//--------------------------------------------------------------------------------
//-------------------------Sale-------------------------------------
//--------------------------------------------------------------------------------

export const createSalePrisma = async (data) => {
    // Se declara con `export const`, por lo que quedo fuera del barrido de
    // guardas sobre `export async function`. El businessId venia dentro del
    // payload del cliente: se fuerza el de la sesion.
    data = { ...data, businessId: await assertBusinessId(data?.businessId) };
    const {
        businessId,
        clientId,
        employeeId,
        appointmentId,
        couponId,   // ID del cupón aplicado (opcional)
        tokenId,    // ID del token impreso de un solo uso (opcional)
        items, // Array de { serviceId, description, price, quantity }
        payment, // Objeto { amount, method, received, change }
        totals, // Objeto { subtotal, discount, total }
        mpPaymentId = null,
        mpFee = null,
        mpNetReceived = null,
        mpTaxes = null,
        mpReleaseDate = null,
        promotionDiscount = null,
    } = data;

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Creamos la Venta principal
            const newSale = await tx.sale.create({
                data: {
                    businessId,
                    clientId,
                    employeeId,
                    appointmentId,
                    couponId: couponId || null,
                    subtotal: totals.subtotal,
                    discount: totals.discount,
                    total: totals.total,
                    status: 'COMPLETED',
                    // 2. Creamos los ítems de la venta en la misma operación (Nested Write)
                    items: {
                        create: items.map((item) => ({
                            serviceId: item.serviceId || null,
                            productId: item.productId || null,
                            description: item.description,
                            price: item.price,
                            quantity: item.quantity || 1,
                            couponCovered: item.couponCovered ?? false,
                        })),
                    },
                    // 3. Creamos el registro del pago (Soporta múltiples pagos "Split Payments")
                    payments: {
                        create: Array.isArray(payment)
                            ? payment.map((p) => ({
                                businessId,
                                amount: p.amount,
                                method: p.method,
                                amountReceived: p.received,
                                changeReturned: p.change,
                                status: 'COMPLETED',
                                terminalId: p.terminalId || null,
                            }))
                            : {
                                businessId,
                                amount: payment.amount,
                                method: payment.method,
                                amountReceived: payment.received,
                                changeReturned: payment.change,
                                status: 'COMPLETED',
                                terminalId: payment.terminalId || null,
                            },
                    },
                },
                // Incluimos los datos relacionados para devolverlos al frontend (para el ticket)
                include: {
                    items: true,
                    payments: true,
                },
            });

            // 4. Guardar campos MP y de promociones (raw SQL para no depender del cliente generado)
            if (mpPaymentId || mpFee != null || mpNetReceived != null || mpTaxes != null || mpReleaseDate != null || promotionDiscount != null) {
                await tx.$executeRawUnsafe(
                    `UPDATE "Sale" SET "mpPaymentId" = $1, "mpFee" = $2, "mpNetReceived" = $3, "mpTaxes" = $4, "mpReleaseDate" = $5, "promotionDiscount" = $6 WHERE id = $7`,
                    mpPaymentId ?? null,
                    mpFee ?? null,
                    mpNetReceived ?? null,
                    mpTaxes ?? null,
                    mpReleaseDate ? new Date(mpReleaseDate) : null,
                    promotionDiscount ?? null,
                    newSale.id
                );
            }

            // 5. Si la venta viene de una cita, la marcamos como completada
            if (appointmentId) {
                await tx.appointment.update({
                    where: { id: appointmentId, active: true },
                    data: { status: 'COMPLETED', paymentStatus: "PAID" },
                });
            }

            // 5. Quemar el cupón (incrementar usedCount)
            if (couponId) {
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }

            // 6. Marcar el token físico como usado (cupón impreso de un solo uso)
            if (tokenId) {
                await tx.couponToken.update({
                    where: { id: tokenId },
                    data: { usedAt: new Date(), saleId: newSale.id },
                });
            }

            return newSale;
        }, {
            maxWait: 5000, // Tiempo máximo para esperar una conexión (5s)
            timeout: 30000 // Tiempo máximo para que se ejecute la transacción (30s)
        });

        return { success: true, sale: result };
    } catch (error) {
        console.error("Error en la transacción de venta:", error);
        return { success: false, error: error.message };
    }
};

export async function getSalePrisma(businessId, id) {
    businessId = await assertBusinessId(businessId);
    const sale = await prisma.sale.findFirst({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return sale
}

export async function getSalesPrisma(businessId) {
    businessId = await assertBusinessId(businessId);
    const sales = await prisma.sale.findMany({
        where: {
            businessId: businessId,
            active: true
        },
        orderBy: { createdAt: 'desc' },
        include: {
            employee: {
                include: {
                    user: {
                        select: {
                            name: true,
                            lastName: true,
                            email: true,
                        },
                    },
                }
            },
            items: true,
            coupon: { select: { id: true, code: true, name: true, category: true } },
            payments: {
                where: {
                    active: true
                }
            }
        }
    });

    if (sales.length === 0) return sales;

    const placeholders = sales.map((_, i) => `$${i + 1}`).join(', ');
    const mpRows = await prisma.$queryRawUnsafe(
        `SELECT id::text, "mpFee", "mpPaymentId", "mpNetReceived", "mpTaxes" FROM "Sale" WHERE id::text IN (${placeholders})`,
        ...sales.map(s => s.id)
    );
    const mpMap = Object.fromEntries(mpRows.map(r => [r.id, r]));

    return sales.map(s => ({
        ...s,
        mpFee: mpMap[s.id]?.mpFee ?? null,
        mpPaymentId: mpMap[s.id]?.mpPaymentId ?? null,
        mpNetReceived: mpMap[s.id]?.mpNetReceived ?? null,
        mpTaxes: mpMap[s.id]?.mpTaxes ?? null,
    }));
}

export async function getSaleByAppointmentPrisma(businessId, appointmentId) {
    businessId = await assertBusinessId(businessId);
    const sale = await prisma.sale.findFirst({
        where: {
            businessId,
            appointmentId,
            active: true
        },
        include: {
            items: true,
            coupon: { select: { id: true, code: true, name: true, category: true } },
            payments: {
                where: { active: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    if (!sale) return sale;

    const mpRows = await prisma.$queryRaw`
        SELECT "mpFee", "mpPaymentId", "mpNetReceived", "mpTaxes", "mpReleaseDate" FROM "Sale" WHERE id::text = ${sale.id}
    `;
    return {
        ...sale,
        mpFee: mpRows[0]?.mpFee ?? null,
        mpPaymentId: mpRows[0]?.mpPaymentId ?? null,
        mpNetReceived: mpRows[0]?.mpNetReceived ?? null,
        mpTaxes: mpRows[0]?.mpTaxes ?? null,
        mpReleaseDate: mpRows[0]?.mpReleaseDate ?? null,
    };
}

export async function updateSalePrisma(id, businessId, clientId, employeeId, appointmentId, subtotal, discount, total, status, notes) {
    businessId = await assertBusinessId(businessId);
    const sale = await prisma.sale.update({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
        data: {
            businessId, clientId, employeeId, appointmentId, subtotal, discount, total, status, notes
        },
    })

    return sale
}

export async function deleteSalePrisma(businessId, id) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const sale = await prisma.sale.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return sale
}

//--------------------------------------------------------------------------------
//-------------------------SaleItem-------------------------------------
//--------------------------------------------------------------------------------  

export async function createSaleItemPrisma(saleId, serviceId, description, price, quantity) {
    await requireSession();
    const saleItem = await prisma.saleItem.create({
        data: {
            saleId, serviceId, description, price, quantity
        },
    })

    return saleItem
}

export async function getSaleItemPrisma(businessId, saleId) {
    businessId = await assertBusinessId(businessId);
    const saleItem = await prisma.saleItem.findFirst({
        where: {
            saleId: saleId,
            businessId: businessId,
            active: true
        },
    })

    return saleItem
}

export async function updateSaleItemPrisma(id, saleId, serviceId, description, price, quantity) {
    await requireSession();
    const saleItem = await prisma.saleItem.update({
        where: {
            id: id,
            active: true
        },
        data: {
            saleId, serviceId, description, price, quantity
        },
    })

    return saleItem
}

export async function deleteSaleItemPrisma(businessId, id) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const saleItem = await prisma.saleItem.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return saleItem
}

//--------------------------------------------------------------------------------
//-------------------------Review-------------------------------------
//--------------------------------------------------------------------------------  

export async function createReviewPrisma(businessId, clientId, rating, comment) {
    businessId = await assertBusinessId(businessId);
    const review = await prisma.review.create({
        data: {
            businessId, clientId, rating, comment
        },
    })

    return review
}

export async function getReviewPrisma(businessId, id) {
    businessId = await assertBusinessId(businessId);
    const review = await prisma.review.findFirst({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return review
}

export async function updateReviewPrisma(id, businessId, clientId, rating, comment) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const review = await prisma.review.update({
        where: {
            id: id,
            active: true
        },
        data: {
            businessId, clientId, rating, comment
        },
    })

    return review
}

export async function deleteReviewPrisma(businessId, id) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    const review = await prisma.review.delete({
        where: {
            id: id,
            businessId: businessId,
            active: true
        },
    })

    return review
}


//corte de caja
export async function getCashCloseSummary(businessId) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    // A. Buscar el último corte
    const lastClose = await prisma.cashClose.findFirst({
        where: { businessId, active: true },
        orderBy: { closingDate: 'desc' },
    })

    const openingDate = lastClose
        ? lastClose.closingDate
        : new Date(new Date().setHours(0, 0, 0, 0))
    const closingDate = new Date()

    // B. Los pagos recibidos en el periodo.
    //
    // Se consultan los PAGOS por su propia fecha, no las ventas por la suya.
    // Antes se listaban las ventas COMPLETED creadas en el rango y se sumaban
    // sus pagos, lo que atribuia el dinero al dia en que se creo la venta y no
    // al dia en que entro a la caja. Con anticipos eso falla siempre: el
    // anticipo entra un dia y el resto otro.
    //
    // Se excluyen los pagos de ventas canceladas o devueltas; los de una venta
    // todavia abierta -un anticipo- SI cuentan, porque ese dinero ya esta en
    // el cajon.
    const payments = await prisma.payment.findMany({
        where: {
            businessId,
            status: 'COMPLETED',
            active: true,
            createdAt: {
                gte: openingDate,
                lte: closingDate,
            },
            sale: {
                active: true,
                status: { notIn: ['CANCELLED', 'REFUNDED'] },
            },
        },
        select: { method: true, amount: true, saleId: true },
    })

    // C. Clasificar los totales por metodo de pago
    let cashExpected = 0
    let cardTotal = 0
    let transferTotal = 0

    payments.forEach(payment => {
        if (payment.method === 'CASH') cashExpected += payment.amount
        if (payment.method === 'CARD') cardTotal += payment.amount
        if (payment.method === 'TRANSFER') transferTotal += payment.amount
    })

    // Ventas distintas tocadas en el periodo, no numero de pagos: un ticket
    // pagado mitad en efectivo y mitad con tarjeta sigue siendo una venta.
    const salesCount = new Set(payments.map(p => p.saleId)).size

    return {
        openingDate,
        closingDate,
        cashExpected,
        cardTotal,
        transferTotal,
        totalSales: cashExpected + cardTotal + transferTotal,
        salesCount,
    }
}

// 2. Guardar el corte de caja en la base de datos
export async function createCashClose(data) {
    const { userId: sessionUserId, business } = await requireSession();
    data = { ...data, businessId: business.id, userId: sessionUserId };
    const difference = data.cashActual - data.cashExpected

    const cashClose = await prisma.cashClose.create({
        data: {
            businessId: data.businessId,
            userId: data.userId,
            openingDate: data.openingDate,
            closingDate: new Date(),
            cashExpected: data.cashExpected,
            cashActual: data.cashActual,
            difference: difference,
            notes: data.notes,
        },
    })

    return cashClose
}

export async function getDailySummary(businessId, start) {
    businessId = await assertBusinessId(businessId, ["ADMIN", "RECEPTION"]);
    if (!businessId) return
    // Rango de fechas para "Hoy" (desde las 00:00:00 hasta las 23:59:59)
    // const today = new Date()
    // const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    // const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    const startOfDay = new Date(`${start}T00:00:00.000-06:00`);

    // Forzamos el fin del día con el desfase de UTC-6
    const endOfDay = new Date(`${start}T23:59:59.999-06:00`);



    // Buscar empleados con sus ventas y citas de HOY
    const employees = await prisma.employee.findMany({
        where: { businessId, active: true },
        include: {
            user: {
                select: {
                    name: true,
                    lastName: true,
                    email: true,
                },
            },
            // Ventas completadas hoy
            sales: {
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: 'COMPLETED',
                    active: true
                },
                include: {
                    payments: {
                        where: { status: 'COMPLETED', active: true },
                    },
                },
            },
            // Citas programadas para hoy que siguen PENDING (o que no se han cobrado)
            appointments: {
                where: {
                    start: { gte: startOfDay, lte: endOfDay },
                    status: 'PENDING', // Puedes ajustar esto si usas otro estado
                    active: true
                },
            },
        },
    })

    // Mapa saleId -> mpFee (campo guardado vía raw SQL, no lo conoce el cliente Prisma)
    const feeRows = await prisma.$queryRaw`
        SELECT id::text AS id, "mpFee"
        FROM "Sale"
        WHERE "businessId" = ${businessId}
          AND status = 'COMPLETED'
          AND active = true
          AND "createdAt" >= ${startOfDay}
          AND "createdAt" <= ${endOfDay}
          AND "mpFee" IS NOT NULL
    `;
    const feeMap = Object.fromEntries(feeRows.map((r) => [r.id, Number(r.mpFee) || 0]));

    // Variables para los totales globales del negocio
    let totalDay = 0
    let totalCashDay = 0
    let totalCardDay = 0
    let totaTransferDay = 0

    // Procesar los datos por cada empleado
    const employeeStats = employees.map((emp) => {
        let cash = 0
        let card = 0
        let transfer = 0
        let mpFee = 0

        emp.sales.forEach((sale) => {
            sale.payments.forEach((payment) => {
                // Asumiendo que tu modelo Payment tiene el campo 'amount'
                if (payment.method === 'CASH') {
                    cash += payment.amount
                    totalCashDay += payment.amount
                }
                if (payment.method === 'CARD') {
                    card += payment.amount
                    totalCardDay += payment.amount
                }
                if (payment.method === 'TRANSFER') {
                    transfer += payment.amount
                    totaTransferDay += payment.amount
                }
                totalDay += payment.amount
            })
            mpFee += feeMap[sale.id] || 0
        })

        const gross = cash + card + transfer

        return {
            id: emp.id,
            name: `${emp.user.name} ${emp.user.lastName}` || 'Empleado sin nombre', // Asumiendo que Employee tiene un campo name
            cash,
            card,
            transfer,
            mpFee,                 // comisión MP del día para esta empleada
            gross,                 // total bruto cobrado
            net: gross - mpFee,    // neto real tras comisión MP
            pendingAppointments: emp.appointments.length,
            sales: emp.sales,
        }
    })

    const totalMpFeeDay = Object.values(feeMap).reduce((a, b) => a + b, 0);

    return {
        date: startOfDay,
        totalDay,
        totalCashDay,
        totalCardDay,
        totaTransferDay,
        totalMpFeeDay,
        netCardDay: totalCardDay - totalMpFeeDay,
        netDay: totalDay - totalMpFeeDay,   // neto total del día (todos los métodos)
        employeeStats,
    }
}


export async function MigrateToBetterAuth() {
    await requireSession(["ADMIN"]);
    console.log("Iniciando migración de contraseñas...");

    // 1. Buscamos todos los usuarios que tengan una contraseña en la tabla vieja
    const users = await prisma.user.findMany();

    console.log(`Se encontraron ${users.length} usuarios para migrar.`);

    let migradas = 0;

    // 2. Recorremos los usuarios uno por uno
    for (const user of users) {
        // Verificamos que no le hayamos migrado la cuenta ya en un intento anterior
        const existingAccount = await prisma.account.findFirst({
            where: {
                userId: user.id,
                providerId: "credential",
            },
        });

        if (!existingAccount && user.password) {
            // 3. Creamos el registro en la tabla Account que Better Auth espera
            await prisma.account.create({
                data: {
                    id: randomUUID(), // ID único para la cuenta
                    userId: user.id,
                    accountId: user.email, // Better Auth enlaza el email aquí para credentials
                    providerId: "credential",
                    password: user.password, // Movemos el hash tal cual estaba

                    // Estos campos son obligatorios en el esquema pero no aplican para credentials, 
                    // los dejamos en null o vacíos si tu esquema lo exige (depende de si los pusiste opcionales)
                    accessToken: null,
                    refreshToken: null,
                },
            });
            migradas++;
            console.log(`✅ Contraseña migrada para: ${user.email}`);
        } else {
            console.log(`⏭️ Omitiendo ${user.email} (Ya tiene cuenta o no tiene password)`);
        }
    }

    console.log(`\n¡Migración completada! Se migraron ${migradas} contraseñas exitosamente.`);
}
"use server";
import prisma from "@/lib/prisma2";
import { getBusiness } from "@/lib/getBusiness";
import { revalidatePath } from "next/cache";

export async function requestAppointmentModification(payload: any) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const { appointmentId, serviceId, action, employeeRequesterId, appointmentServiceId } = payload;

  const request = await prisma.appointmentServiceRequest.create({
    data: {
      appointmentId,
      serviceId,
      appointmentServiceId, // Present if action === "REMOVE"
      employeeRequesterId,
      action,
      status: "PENDING",
    },
  });

  revalidatePath("/calendar");
  return request;
}

export async function getPendingRequests(appointmentId?: string) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const filter: any = { status: "PENDING", appointment: { businessId: business.id } };
  if (appointmentId) filter.appointmentId = appointmentId;

  const requests = await prisma.appointmentServiceRequest.findMany({
    where: filter,
    include: {
      service: true,
      appointment: true,
      employee: {
        include: { user: true }
      }
    }
  });

  return requests;
}

export async function resolveModificationRequest(requestId: string, approved: boolean, price?: number) {
  const business = await getBusiness();
  if (!business) throw new Error("No business found");

  const request = await prisma.appointmentServiceRequest.findUnique({
    where: { id: requestId },
    include: { appointment: true, service: true },
  });

  if (!request) throw new Error("Request not found");

  if (!approved) {
    await prisma.appointmentServiceRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED" },
    });
    revalidatePath("/calendar");
    return;
  }

  // Si fue aprobado
  if (request.action === "ADD") {
    await prisma.appointmentService.create({
      data: {
        appointmentId: request.appointmentId,
        serviceId: request.serviceId,
        price: price || request.service?.price || 0,
      }
    });

    // Sumar el precio al totalAmount del appointment
    await prisma.appointment.update({
      where: { id: request.appointmentId },
      data: {
        totalAmount: request.appointment.totalAmount + (price || request.service?.price || 0)
      }
    });
  } else if (request.action === "REMOVE" && request.appointmentServiceId) {
    const apptService = await prisma.appointmentService.findUnique({
       where: { id: request.appointmentServiceId }
    });
    
    if (apptService) {
       await prisma.appointment.update({
        where: { id: request.appointmentId },
        data: { totalAmount: Math.max(0, request.appointment.totalAmount - apptService.price) }
      });
      await prisma.appointmentService.delete({
        where: { id: request.appointmentServiceId }
      });
    }
  }

  await prisma.appointmentServiceRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  revalidatePath("/calendar");
}

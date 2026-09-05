"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";

import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Badge from "../ui/badge/Badge";
import Pagination from "@/components/tables/Pagination";
import Moddal from "@/components/customers/Modal";
import { Modal } from "@/components/ui/modal";
import { createClientPrisma, updateClientPrisma, deleteClientPrisma } from "@/lib/prisma";
import { useBusiness } from "@/context/BusinessContext";
import type { Employee as PrismaEmployee } from "@prisma/client";

// Definimos la interfaz basada en tu esquema de Prisma
interface Client {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string | Date;
    employee?: { user?: { name?: string } } | null;
}

/**
 * Una membresía con los datos de la persona.
 *
 * Se deriva del modelo de Prisma en vez de escribirse a mano. La versión
 * anterior mentía sobre la base: declaraba `phone`, `bio` y `email` como
 * obligatorios cuando las tres columnas admiten null, y `createdAt` como
 * string cuando es Date. Nadie lo notó mientras el cliente de Prisma llegaba
 * como `any`; en cuanto se tipó, saltó.
 */
export type EmployeeUser = {
    name: string;
    lastName: string;
    email: string | null;
};

export type Employee = PrismaEmployee & {
    user: EmployeeUser;
};

interface CustomerTableProps {
    customers: Client[];
    employees: Employee[];
}

/** Número limpio para el enlace de WhatsApp: solo dígitos. */
const waHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export default function CustomerTable({ customers, employees }: CustomerTableProps) {
    const router = useRouter();
    const business = useBusiness();

    const handleRefresh = () => {
        router.refresh();
    };

    const initialClient: Client = {
        id: "",
        name: "",
        phone: "",
        email: "",
        notes: "",
        createdAt: ""
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Client>(initialClient); // id vacío = Crear nuevo
    const [openDeleteCustomer, setOpenDeleteCustomer] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const itemsPerPage = 7;

    // Lógica de paginación
    const totalPages = Math.ceil(customers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = customers.slice(startIndex, startIndex + itemsPerPage);

    // Abrir modal para CREAR
    const handleNewClient = () => {
        setCustomerToEdit(initialClient); // Limpiamos para que sea "Nuevo"
        setIsModalOpen(true);
    };

    // Abrir modal para EDITAR
    const handleEditClient = (customer: Client) => {
        setCustomerToEdit(customer);
        setIsModalOpen(true);
    };

    // Guardar (Recibe los datos del modal)
    const handleSaveCustomer = async (formData: any) => {
        if (formData.id) {
            updateClientPrisma(formData.id, business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId);
        } else {
            createClientPrisma(business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId);
        }
        handleRefresh();
        setIsModalOpen(false);
    };

    const handleDeleteCustomer = () => {
        setOpenDeleteCustomer(true);
    };

    const deleteCustomer = async () => {
        await deleteClientPrisma(customerToEdit?.id, business?.id);
        setCustomerToEdit(initialClient);
        setIsModalOpen(false);
        handleRefresh();
        setOpenDeleteCustomer(false);
    };

    // Una sola definición de columnas: DataTable la usa para la tabla en
    // pantalla ancha y para las tarjetas cuando no cabe.
    const columns: Column<Client>[] = [
        {
            key: "cliente",
            header: "Cliente",
            primary: true,
            cell: (customer) => (
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold uppercase text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                        {customer.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                        <span className="block truncate font-medium text-gray-800 dark:text-white/90">
                            {customer.name}
                        </span>
                        <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">
                            {customer.email || "Sin correo"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: "contacto",
            header: "Contacto",
            // En tarjeta el teléfono se muestra como botón de WhatsApp a lo
            // ancho, en cardFooter: más cómodo de tocar que una insignia.
            hideOnCard: true,
            cell: (customer) =>
                customer.phone ? (
                    <a
                        href={waHref(customer.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Badge size="sm" color="success">
                            {customer.phone}
                        </Badge>
                    </a>
                ) : (
                    <Badge size="sm" color="light">N/A</Badge>
                ),
        },
        {
            key: "empleado",
            header: "Empleado asignado",
            cell: (customer) => (
                <span className="block truncate">
                    {customer.employee?.user?.name || "Sin asignar"}
                </span>
            ),
        },
        {
            key: "registro",
            header: "Registro",
            cell: (customer) => new Date(customer.createdAt).toLocaleDateString("es-MX"),
        },
    ];

    return (
        <>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:justify-between">
                <button
                    onClick={handleNewClient}
                    className="h-11 cursor-pointer rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                >
                    Nuevo Cliente
                </button>
                <div className="flex flex-wrap items-center justify-center gap-2 py-3 sm:justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {customers.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, customers.length)} de {customers.length} clientes
                    </p>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                rows={currentData}
                rowKey={(customer) => customer.id}
                onRowClick={handleEditClient}
                empty="Todavía no hay clientes registrados."
                cardFooter={(customer) =>
                    customer.phone ? (
                        <a
                            href={waHref(customer.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 font-medium text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-900/25 dark:text-green-300"
                        >
                            <Phone size={16} />
                            <span>WhatsApp ({customer.phone})</span>
                        </a>
                    ) : (
                        <div className="flex h-11 w-full items-center justify-center rounded-lg border border-gray-100 bg-gray-50 text-sm text-gray-400 dark:border-white/5 dark:bg-white/3">
                            Sin teléfono
                        </div>
                    )
                }
            />

            {/* Modal */}
            {isModalOpen && (
                <Moddal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveCustomer}
                    customerToEdit={customerToEdit}
                    employees={employees}
                    handleDeleteCustomer={handleDeleteCustomer}
                />
            )}

            <Modal
                className="flex max-w-md items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                isOpen={openDeleteCustomer} onClose={() => setOpenDeleteCustomer(false)}
            >
                <div className="flex flex-none items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                            Eliminar
                        </h5>
                        <p className="hidden text-sm text-gray-500 sm:block">¿Estás seguro de eliminar?</p>
                    </div>
                </div>

                <div className="safe-area-pb border-t border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex gap-2">
                        <button onClick={deleteCustomer} className="flex-1 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-700">
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

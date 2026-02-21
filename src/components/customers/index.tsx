"use client";
import React, { useEffect, useState } from "react";
import Table from "@/components/customers/Table";
import TableMobile from "@/components/customers/TableMobile";
import Badge from "../ui/badge/Badge";
import Pagination from "@/components/tables/Pagination"; // Asumiendo que lo guardaste aquí
import Moddal from "@/components/customers/Modal";
import { Modal } from "@/components/ui/modal";
import { createClientPrisma, updateClientPrisma, deleteClientPrisma } from "@/lib/prisma";
import { useBusiness } from "@/context/BusinessContext";
import { useRouter } from "next/navigation";

// createClientPrisma(businessId, name, phone, email, notes, employeeId)
// updateClientPrisma(id, businessId, name, phone, email, notes, employeeId) 
// deleteClientPrisma(id, businessId) 

// Definimos la interfaz basada en tu esquema de Prisma
interface Client {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string | Date;
}

export interface EmployeeUser {
    name: string;
    lastName: string;
    email: string; // Puede venir vacía según tu JSON
}

export interface Employee {
    id: string;
    businessId: string;
    userId: string;
    phone: string;
    bio: string;
    commission: number;
    rating: number;
    active: boolean;
    createdAt: string; // Viene como ISO String. Si usas 'new Date()' cámbialo a Date
    user: EmployeeUser;
}

interface CustomerTableProps {
    customers: Client[];
    employees: Employee[];
}

export default function CustomerTable({ customers, employees }: CustomerTableProps) {
    const router = useRouter();

    const handleRefresh = () => {
        router.refresh();
    };
    const business = useBusiness();
    const [isMobile, setIsMobile] = useState(false);
    // 1. Estados
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Client | null>(null); // null = Crear nuevo
    const [openDeleteCustomer, setOpenDeleteCustomer] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7; // Ajusta cuántos clientes ver por página

    // Lógica de paginación
    const totalPages = Math.ceil(customers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = customers.slice(startIndex, startIndex + itemsPerPage);

    // Abrir modal para CREAR
    const handleNewClient = () => {
        setCustomerToEdit(null); // Limpiamos para que sea "Nuevo"
        setIsModalOpen(true);
    };

    // Abrir modal para EDITAR (Esta se la pasas a la Tabla y al MobileList)
    const handleEditClient = (customer: Client) => {
        setCustomerToEdit(customer); // Cargamos los datos
        setIsModalOpen(true);
    };

    // Guardar (Recibe los datos del modal)
    const handleSaveCustomer = async (formData: any) => {
        if (formData.id) {
            // Lógica de UPDATE (PUT)
            console.log("Actualizando cliente:", formData);
            updateClientPrisma(formData.id, business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId)
        } else {
            // Lógica de CREATE (POST)
            console.log("Creando cliente:", formData);
            createClientPrisma(business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId)
        }
        handleRefresh()
        setIsModalOpen(false); // Cerramos modal
        // refreshData(); // Recargar la lista
    };

    const handleDeleteCustomer = () => {
        console.log("Eliminando cliente", customerToEdit);
        setOpenDeleteCustomer(true);
    };

    const deleteCustomer = async () => {
        console.log("Eliminando cliente", customerToEdit);
        await deleteClientPrisma(customerToEdit?.id, business?.id)
        setCustomerToEdit(null);
        setIsModalOpen(false)
        handleRefresh()
        setOpenDeleteCustomer(false);
    };

    return (
        <>
            <div className="mb-6 flex flex-wrap justify-center sm:justify-between items-center">
                <button onClick={handleNewClient} className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
                    Nuevo Cliente
                </button>
                <div className="flex flex-wrap justify-center sm:justify-between items-center px-4 py-3 gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, customers.length)} de {customers.length} clientes
                    </p>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>

            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                <div className="max-w-full overflow-x-hidden">
                    {/* {isMobile ? <TableMobile customers={currentData} onRowClick={(customer: any) => console.log(customer)} /> : <Table customers={currentData} onRowClick={(customer: any) => console.log(customer)} />} */}
                    {/* Tablas */}
                    {isMobile ? (
                        <TableMobile customers={currentData} onRowClick={handleEditClient} />
                    ) : (
                        <Table customers={currentData} onRowClick={handleEditClient} />
                    )}
                </div>
            </div>



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
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
                isOpen={openDeleteCustomer} onClose={() => setOpenDeleteCustomer(false)}
            >
                {/* HEADER */}
                <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
                    <div>
                        <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                            Elimiar
                        </h5>
                        <p className="text-sm text-gray-500 hidden sm:block">¿Estás seguro de eliminar?</p>
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-gray-200 shadow-sm safe-area-pb">

                    <div className="flex gap-2">
                        <button onClick={deleteCustomer} className="flex-1 py-3 bg-brand-500 text-white rounded-xl text-sm font-bold hover:bg-brand-700">
                            Eliminar
                        </button>

                    </div>
                </div>
            </Modal >
        </>
    );
}
"use client";
import React, { useEffect, useState } from "react";
import Table from "@/components/customers/Table";
import TableMobile from "@/components/customers/TableMobile";
import Badge from "../ui/badge/Badge";
import Pagination from "@/components/tables/Pagination"; // Asumiendo que lo guardaste aquí
import Moddal from "@/components/customers/Modal";

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
    const [isMobile, setIsMobile] = useState(false);
    // 1. Estados
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState(null); // null = Crear nuevo

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
    const handleEditClient = (customer: any) => {
        setCustomerToEdit(customer); // Cargamos los datos
        setIsModalOpen(true);
    };

    // Guardar (Recibe los datos del modal)
    const handleSaveCustomer = async (formData: any) => {
        if (formData.id) {
            // Lógica de UPDATE (PUT)
            console.log("Actualizando cliente:", formData);
        } else {
            // Lógica de CREATE (POST)
            console.log("Creando cliente:", formData);
        }

        setIsModalOpen(false); // Cerramos modal
        // refreshData(); // Recargar la lista
    };

    return (
        <>
            <div className="mb-6 flex flex-wrap justify-center sm:justify-between items-center">
                <button className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium">
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
            <Moddal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCustomer}
                customerToEdit={customerToEdit}
                employees={employees}
            />

            {/* Footer con Paginación */}

        </>
    );
}
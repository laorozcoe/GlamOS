"use client";
import React, { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";
import Pagination from "@/components/tables/Pagination"; // Asumiendo que lo guardaste aquí

// Definimos la interfaz basada en tu esquema de Prisma
interface Client {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: string | Date;
}

interface CustomerTableProps {
    customers: Client[];
}

export default function CustomerTable({ customers }: CustomerTableProps) {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 7; // Ajusta cuántos clientes ver por página

    // Lógica de paginación
    const totalPages = Math.ceil(customers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = customers.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
                <div className="max-w-full overflow-x-auto">
                    <div className="min-w-[800px]">
                        <Table>
                            <TableHeader className="border-b border-gray-100 dark:border-white/5">
                                <TableRow>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                        Nombre del Cliente
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                        Contacto
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                        Notas / Historial
                                    </TableCell>
                                    <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                                        Registro
                                    </TableCell>
                                </TableRow>
                            </TableHeader>

                            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                                {currentData.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="px-5 py-4 text-start">
                                            <div className="flex items-center gap-3">
                                                {/* Avatar genérico con la inicial */}
                                                <div className="flex items-center justify-center w-10 h-10 overflow-hidden bg-blue-100 rounded-full text-blue-600 font-bold uppercase">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                                        {client.name}
                                                    </span>
                                                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                                                        {client.email || "Sin correo"}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                            <Badge size="sm" color="success">
                                                {client.phone || "N/A"}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400 max-w-[200px] truncate">
                                            {client.notes || "Sin observaciones"}
                                        </TableCell>

                                        <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                            {new Date(client.createdAt).toLocaleDateString('es-MX')}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Footer con Paginación */}
            <div className="flex justify-between items-center px-4 py-3">
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
    );
}
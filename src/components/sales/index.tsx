"use client";
import React, { useEffect, useState } from "react";
import Table from "@/components/sales/Table";
import TableMobile from "@/components/sales/TableMobile";
import Badge from "../ui/badge/Badge";
import Pagination from "@/components/tables/Pagination"; // Asumiendo que lo guardaste aquí
import Moddal from "@/components/customers/Modal";
import { Modal } from "@/components/ui/modal";
import { createClientPrisma, updateClientPrisma, deleteClientPrisma } from "@/lib/prisma";
import { useBusiness } from "@/context/BusinessContext";
import { useRouter } from "next/navigation";
import Button from "../ui/button/Button";
import { usePrinter } from "@/hooks/usePrinter";
import { toast } from "react-toastify";
import Label from "@/components/form/Label";
import { PaymentMethodBadge } from "./PaymentMeta";

// createClientPrisma(businessId, name, phone, email, notes, employeeId)
// updateClientPrisma(id, businessId, name, phone, email, notes, employeeId) 
// deleteClientPrisma(id, businessId) 

// Definimos la interfaz basada en tu esquema de Prisma
// interface Client {
//     id: string;
//     name: string;
//     phone: string | null;
//     email: string | null;
//     notes: string | null;
//     createdAt: string | Date;
// }

// export interface EmployeeUser {
//     name: string;
//     lastName: string;
//     email: string; // Puede venir vacía según tu JSON
// }

// export interface Employee {
//     id: string;
//     businessId: string;
//     userId: string;
//     phone: string;
//     bio: string;
//     commission: number;
//     rating: number;
//     active: boolean;
//     createdAt: string; // Viene como ISO String. Si usas 'new Date()' cámbialo a Date
//     user: EmployeeUser;
// }

// interface CustomerTableProps {
//     customers: Client[];
//     employees: Employee[];
// }

export default function SalesTable({ sales }: any) {
    // const router = useRouter();

    // const handleRefresh = () => {
    //     router.refresh();
    // };
    // const business = useBusiness();
    const [isMobile, setIsMobile] = useState(false);
    const business = useBusiness();
    const { printTicket } = usePrinter();

    // const initialClient: Client = {
    //     id: "",
    //     name: "",
    //     phone: "",
    //     email: "",
    //     notes: "",
    //     createdAt: ""
    // };
    // // 1. Estados
    // const [isModalOpen, setIsModalOpen] = useState(false);
    // const [customerToEdit, setCustomerToEdit] = useState<Client>(initialClient); // null = Crear nuevo
    // const [openDeleteCustomer, setOpenDeleteCustomer] = useState(false);

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
    const [selectedSale, setSelectedSale] = useState<any | null>(null);
    const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
    const itemsPerPage = 7; // Ajusta cuántos clientes ver por página

    // // Lógica de paginación
    const totalPages = Math.ceil(sales.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = sales.slice(startIndex, startIndex + itemsPerPage);

    const handleReprintSale = async (sale: any) => {
        try {
            const completedPayment = sale?.payments?.find((p: any) => p.status === "COMPLETED") || sale?.payments?.[0];
            const items = (sale?.items || []).map((item: any) => ({
                quantity: item.quantity || 1,
                ticket_desc: item.description || "Servicio",
                price: Number(item.price || 0) * Number(item.quantity || 1)
            }));

            const totalFallback = items.reduce((acc: number, item: any) => acc + Number(item.price || 0), 0);
            const createdAt = new Date(sale.createdAt || new Date());

            await printTicket({
                businessName: business?.name || "Brillarte Bloom",
                folio: sale.folio || sale.id?.slice(-6) || "SALE",
                total: Number(sale.total ?? totalFallback),
                paymentMethod: completedPayment?.method || "N/A",
                received: Number(completedPayment?.amountReceived ?? sale.total ?? totalFallback),
                change: Number(completedPayment?.changeReturned ?? 0),
                date: createdAt.toLocaleDateString("es-MX"),
                time: createdAt.toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }),
                items
            });

            toast.success("Ticket reenviado a impresora.");
        } catch (error) {
            console.error("Error reimprimiendo ticket de venta:", error);
            toast.error("No se pudo reimprimir el ticket.");
        }
    };

    const handleOpenSaleDetail = (sale: any) => {
        setSelectedSale(sale);
        setIsSaleDetailOpen(true);
    };

    // // Abrir modal para CREAR
    // const handleNewClient = () => {
    //     setCustomerToEdit(initialClient); // Limpiamos para que sea "Nuevo"
    //     setIsModalOpen(true);
    // };

    // // Abrir modal para EDITAR (Esta se la pasas a la Tabla y al MobileList)
    // const handleEditClient = (customer: Client) => {
    //     setCustomerToEdit(customer); // Cargamos los datos
    //     setIsModalOpen(true);
    // };

    // // Guardar (Recibe los datos del modal)
    // const handleSaveCustomer = async (formData: any) => {
    //     if (formData.id) {
    //         // Lógica de UPDATE (PUT)
    //         console.log("Actualizando cliente:", formData);
    //         updateClientPrisma(formData.id, business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId)
    //     } else {
    //         // Lógica de CREATE (POST)
    //         console.log("Creando cliente:", formData);
    //         createClientPrisma(business?.id, formData.name, formData.phone, formData.email, formData.notes, formData.employeeId)
    //     }
    //     handleRefresh()
    //     setIsModalOpen(false); // Cerramos modal
    //     // refreshData(); // Recargar la lista
    // };

    // const handleDeleteCustomer = () => {
    //     console.log("Eliminando cliente", customerToEdit);
    //     setOpenDeleteCustomer(true);
    // };

    // const deleteCustomer = async () => {
    //     console.log("Eliminando cliente", customerToEdit);
    //     await deleteClientPrisma(customerToEdit?.id, business?.id)
    //     setCustomerToEdit(initialClient);
    //     setIsModalOpen(false)
    //     handleRefresh()
    //     setOpenDeleteCustomer(false);
    // };

    return (
        <>
            <div className="mb-6 flex flex-wrap justify-center sm:justify-end items-center">

                <div className="flex flex-wrap justify-center sm:justify-between items-center px-4 py-3 gap-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, sales.length)} de {sales.length} ventas
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
                        <TableMobile sales={currentData} onReprint={handleReprintSale} onRowClick={handleOpenSaleDetail} />
                    ) : (
                        <Table sales={currentData} onReprint={handleReprintSale} onRowClick={handleOpenSaleDetail} />
                    )}
                </div>
            </div>

            <Modal
                isOpen={isSaleDetailOpen}
                onClose={() => setIsSaleDetailOpen(false)}
                className="w-[95svw] max-w-xl p-0 overflow-hidden"
            >
                <div className="bg-gray-50 dark:bg-gray-800 p-5 border-b border-gray-200 dark:border-gray-700">
                    <Label className="text-lg font-bold">Detalle de Venta</Label>
                    <Label color="text-brand-500 dark:text-brand-400" className="text-sm text-gray-500 mt-1">
                        Folio: {selectedSale?.folio || selectedSale?.id?.slice(-6)}
                    </Label>
                </div>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <Label className="text-gray-500">Empleado</Label>
                            <Label className="font-semibold">{selectedSale?.employee?.user?.name} {selectedSale?.employee?.user?.lastName}</Label>
                        </div>
                        <div className="text-right">
                            <Label className="text-gray-500">Fecha</Label>
                            <Label className="font-semibold">
                                {selectedSale?.createdAt ? new Date(selectedSale.createdAt).toLocaleString("es-MX") : "-"}
                            </Label>
                        </div>
                    </div>

                    {/* Cupón aplicado */}
                    {selectedSale?.coupon && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 text-sm">
                            <span className="text-purple-500">🎟</span>
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                                {selectedSale.coupon.category === "COURTESY" ? "Cortesía" : "Cupón"}: {selectedSale.coupon.code}
                            </span>
                            <span className="ml-auto text-purple-600 dark:text-purple-400 font-bold">
                                -{selectedSale?.discount > 0 ? `$${Number(selectedSale.discount).toLocaleString()}` : "aplicado"}
                            </span>
                        </div>
                    )}

                    <div className="border rounded-xl p-4 space-y-2">
                        <Label className="text-xs font-bold uppercase text-gray-500">Servicios</Label>
                        {(selectedSale?.items || []).length > 0 ? (
                            selectedSale.items.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-sm gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <Label className="truncate">{item.description} x{item.quantity || 1}</Label>
                                        {item.couponCovered && (
                                            <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-700">
                                                Cortesía
                                            </span>
                                        )}
                                    </div>
                                    <Label color={item.couponCovered ? "text-green-600 dark:text-green-400" : "text-brand-500 dark:text-brand-400"} className="font-semibold shrink-0">
                                        {item.couponCovered ? <span className="line-through text-gray-400 mr-1 text-xs">${Number(item.price || 0) * Number(item.quantity || 1)}</span> : null}
                                        {item.couponCovered ? "$0" : `$${Number(item.price || 0) * Number(item.quantity || 1)}`}
                                    </Label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">Sin items registrados.</p>
                        )}
                    </div>

                    <div className="border rounded-xl p-4 space-y-2 text-sm">
                        {selectedSale?.discount > 0 && (
                            <>
                                <div className="flex justify-between">
                                    <Label className="text-gray-500">Subtotal</Label>
                                    <Label className="font-semibold">${selectedSale?.subtotal ?? 0}</Label>
                                </div>
                                <div className="flex justify-between text-green-600 dark:text-green-400">
                                    <Label>Descuento</Label>
                                    <Label className="font-semibold">-${selectedSale?.discount ?? 0}</Label>
                                </div>
                            </>
                        )}
                        <div className="flex justify-between items-center">
                            <Label className="text-gray-500">Método</Label>
                            {selectedSale && <PaymentMethodBadge sale={selectedSale} />}
                        </div>
                        <div className="flex justify-between">
                            <Label className="text-gray-500">Total cobrado {selectedSale?.mpFee > 0 ? "(bruto)" : ""}</Label>
                            <Label color="text-gray-500 dark:text-gray-400" className="font-semibold">${selectedSale?.total ?? 0}</Label>
                        </div>
                        {selectedSale?.mpFee != null && selectedSale.mpFee > 0 && (
                            <>
                                <div className="flex justify-between text-orange-600 dark:text-orange-400">
                                    <Label>Comisión MercadoPago (incl. IVA)</Label>
                                    <Label className="font-semibold">-${Number(selectedSale.mpFee).toFixed(2)}</Label>
                                </div>
                                {/* Neto destacado */}
                                <div className="mt-2 flex items-center justify-between rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3">
                                    <Label className="font-bold text-green-700 dark:text-green-400">Depósito real (neto)</Label>
                                    <Label className="text-2xl font-extrabold text-green-700 dark:text-green-400">
                                        ${(selectedSale.mpNetReceived != null
                                            ? Number(selectedSale.mpNetReceived)
                                            : Number(selectedSale.total) - Number(selectedSale.mpFee)
                                        ).toFixed(2)}
                                    </Label>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setIsSaleDetailOpen(false)}>
                        Cerrar
                    </Button>
                    <Button className="flex-1" onClick={() => selectedSale && handleReprintSale(selectedSale)}>
                        Reimprimir
                    </Button>
                </div>
            </Modal>

            {/* {isModalOpen && (
                <Moddal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveCustomer}
                    customerToEdit={customerToEdit}
                    employees={employees}
                    handleDeleteCustomer={handleDeleteCustomer}
                />
            )} */}

            {/* <Modal
                className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
                isOpen={openDeleteCustomer} onClose={() => setOpenDeleteCustomer(false)}
            >
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
            </Modal > */}
        </>
    );
}
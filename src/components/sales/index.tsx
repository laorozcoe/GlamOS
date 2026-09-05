"use client";

import React, { useState } from "react";
import moment from "moment";
import { Printer } from "lucide-react";
import { toast } from "react-toastify";

import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Pagination from "@/components/tables/Pagination";
import { Modal } from "@/components/ui/modal";
import Button from "../ui/button/Button";
import Label from "@/components/form/Label";
import { useBusiness } from "@/context/BusinessContext";
import { usePrinter } from "@/hooks/usePrinter";
import { PaymentMethodBadge, SaleAmount } from "./PaymentMeta";

export default function SalesTable({ sales }: any) {
    const business = useBusiness();
    const { printTicket } = usePrinter();

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSale, setSelectedSale] = useState<any | null>(null);
    const [isSaleDetailOpen, setIsSaleDetailOpen] = useState(false);
    const itemsPerPage = 7;

    // Lógica de paginación
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

    const employeeName = (sale: any) =>
        sale.employee?.user
            ? `${sale.employee.user.name ?? ""} ${sale.employee.user.lastName ?? ""}`.trim()
            : "Sin asignar";

    // Una sola definición de columnas para la tabla y para las tarjetas.
    const columns: Column<any>[] = [
        {
            key: "ticket",
            header: "Ticket",
            primary: true,
            cell: (sale) => (
                <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold uppercase text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                        {sale.folio}
                    </div>
                    <SaleAmount sale={sale} />
                </div>
            ),
        },
        {
            key: "empleado",
            header: "Empleado",
            cell: (sale) => <span className="block truncate">{employeeName(sale)}</span>,
        },
        {
            key: "total",
            header: "Total",
            align: "right",
            className: "tabular-nums",
            // En tarjeta el importe ya viaja junto al folio, en el título.
            hideOnCard: true,
            cell: (sale) => <SaleAmount sale={sale} />,
        },
        {
            key: "metodo",
            header: "Método",
            cell: (sale) => <PaymentMethodBadge sale={sale} />,
        },
        {
            key: "fecha",
            header: "Fecha",
            className: "whitespace-nowrap tabular-nums",
            cell: (sale) => moment(sale.createdAt).format("YYYY-MM-DD hh:mm a"),
        },
        {
            key: "acciones",
            header: "Ticket",
            align: "right",
            // En tarjeta el botón va a lo ancho en cardFooter.
            hideOnCard: true,
            cell: (sale) => (
                <Button
                    type="button"
                    variant="primary"
                    className="inline-flex items-center justify-center p-0"
                    onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleReprintSale(sale);
                    }}
                    title="Reimprimir ticket"
                >
                    <Printer size={16} />
                </Button>
            ),
        },
    ];

    return (
        <>
            <div className="mb-6 flex flex-wrap items-center justify-center sm:justify-end">
                <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 sm:justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Mostrando {sales.length === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, sales.length)} de {sales.length} ventas
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
                rowKey={(sale) => sale.id}
                onRowClick={handleOpenSaleDetail}
                empty="No hay ventas en este periodo."
                cardFooter={(sale) => (
                    <Button
                        type="button"
                        variant="primary"
                        className="w-full"
                        onClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleReprintSale(sale);
                        }}
                        title="Reimprimir ticket"
                    >
                        <Printer size={16} />
                        <span className="ml-2">Reimprimir ticket</span>
                    </Button>
                )}
            />

            <Modal
                isOpen={isSaleDetailOpen}
                onClose={() => setIsSaleDetailOpen(false)}
                className="max-w-xl overflow-hidden p-0"
            >
                <div className="border-b border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800">
                    <Label className="text-lg font-bold">Detalle de Venta</Label>
                    <Label color="text-brand-500 dark:text-brand-400" className="mt-1 text-sm text-gray-500">
                        Folio: {selectedSale?.folio || selectedSale?.id?.slice(-6)}
                    </Label>
                </div>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
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
                        <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-sm dark:border-purple-700 dark:bg-purple-900/20">
                            <span className="text-purple-500">🎟</span>
                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                                {selectedSale.coupon.category === "COURTESY" ? "Cortesía" : "Cupón"}: {selectedSale.coupon.code}
                            </span>
                            <span className="ml-auto font-bold text-purple-600 dark:text-purple-400">
                                -{selectedSale?.discount > 0 ? `$${Number(selectedSale.discount).toLocaleString()}` : "aplicado"}
                            </span>
                        </div>
                    )}

                    <div className="space-y-2 rounded-xl border p-4">
                        <Label className="text-xs font-bold uppercase text-gray-500">Servicios</Label>
                        {(selectedSale?.items || []).length > 0 ? (
                            selectedSale.items.map((item: any) => (
                                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <Label className="truncate">{item.description} x{item.quantity || 1}</Label>
                                        {item.couponCovered && (
                                            <span className="shrink-0 rounded-full border border-green-200 bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:border-green-700 dark:bg-green-900/40 dark:text-green-400">
                                                Cortesía
                                            </span>
                                        )}
                                    </div>
                                    <Label color={item.couponCovered ? "text-green-600 dark:text-green-400" : "text-brand-500 dark:text-brand-400"} className="shrink-0 font-semibold">
                                        {item.couponCovered ? <span className="mr-1 text-xs text-gray-400 line-through">${Number(item.price || 0) * Number(item.quantity || 1)}</span> : null}
                                        {item.couponCovered ? "$0" : `$${Number(item.price || 0) * Number(item.quantity || 1)}`}
                                    </Label>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-gray-500">Sin items registrados.</p>
                        )}
                    </div>

                    <div className="space-y-2 rounded-xl border p-4 text-sm">
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
                        <div className="flex items-center justify-between">
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
                                <div className="mt-2 flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 dark:border-green-800 dark:bg-green-900/20">
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

                <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-700">
                    <Button variant="outline" className="flex-1" onClick={() => setIsSaleDetailOpen(false)}>
                        Cerrar
                    </Button>
                    <Button className="flex-1" onClick={() => selectedSale && handleReprintSale(selectedSale)}>
                        Reimprimir
                    </Button>
                </div>
            </Modal>
        </>
    );
}

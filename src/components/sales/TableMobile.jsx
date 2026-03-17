import React from 'react';
import Badge from "../ui/badge/Badge";
import { User, Calendar, Briefcase, Phone, ChevronRight } from 'lucide-react'; // Asumiendo que usas Lucide
import Label from "@/components/form/Label"
import moment from "moment"

export default function TableMobile({ sales }) {

    if (!sales || sales.length === 0) {
        return <div className="p-4 text-center text-gray-500">No hay clientes para mostrar.</div>;
    }

    return (
        <div className="flex flex-col gap-3 pb-20"> {/* pb-20 para dar espacio si tienes bottom navigation */}
            {sales.map((sale) => (
                <div
                    key={sale.id}
                    onClick={() => onRowClick && onRowClick(sale)}
                    className="relative flex flex-col p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-transform duration-100 cursor-pointer"
                >
                    {/* --- CABECERA: Avatar y Nombre --- */}
                    <div className="flex items-center justify-between mb-3 gap-3 ">

                        {/* Avatar */}
                        <div className='flex items-center gap-2 flex-row flex-nowrap'>
                            <div className="flex  items-center justify-center w-12 h-12 bg-brand-50 text-brand-600 rounded-full font-bold text-lg border border-blue-100">
                                {sale.folio}
                            </div>
                            <div>
                                <Label className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                                    {sale.total} $
                                </Label>
                                {/* <p className="text-sm text-gray-500 dark: mt-0.5">
                                    {sale.email || "Sin correo"}
                                </p> */}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300  ">
                            <Briefcase size={18} className="" />
                            <Label className="truncate max-w-30">
                                {sale.employee?.user?.name + " " + sale.employee?.user?.lastName || "Sin asignar"}
                            </Label>
                        </div>


                        {/* Indicador de "Ver más" */}
                        {/* <ChevronRight className="text-gray-300 w-5 h-5" /> */}
                    </div>

                    <div className="flex items-center gap-2 justify-between text-xs text-gray-300 border-t border-gray-50 dark:border-gray-800 pt-5">
                        <div className='flex flex-row flex-nowrap gap-2'>
                            <Calendar size={18} />
                            <Label>{moment(sale.createdAt).format("YYYY-MM-DD")}</Label>
                        </div>
                        <div className='flex flex-row flex-nowrap gap-2'>
                            <Calendar size={18} />
                            <Label>{moment(sale.createdAt).format("hh:mm:SS a")}</Label>
                        </div>
                    </div>

                    {/* Fecha */}

                    {/* --- ACCIONES: Botón de WhatsApp grande y cómodo --- */}
                    {/* <div>
                        {sale.phone ? (
                            <a
                                href={`https://wa.me/${sale.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Detiene el evento para no abrir el modal de edición
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-50 text-green-700 dark:bg-green-700 dark:text-green-50 rounded-lg font-medium border border-green-200 hover:bg-green-100 transition-colors"
                            >
                                <Phone size={16} />
                                <span>WhatsApp ({sale.phone})</span>
                            </a>
                        ) : (
                            <div className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50  rounded-lg border border-gray-100 text-sm">
                                <span>Sin teléfono</span>
                            </div>
                        )}
                    </div> */}

                </div>
            ))}
        </div>
    );
}
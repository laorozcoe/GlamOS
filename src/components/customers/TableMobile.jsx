import React from 'react';
import Badge from "../ui/badge/Badge";
import { User, Calendar, Briefcase, Phone, ChevronRight } from 'lucide-react'; // Asumiendo que usas Lucide

export default function TableMobile({ customers, onRowClick }) {

    if (!customers || customers.length === 0) {
        return <div className="p-4 text-center text-gray-500">No hay clientes para mostrar.</div>;
    }

    return (
        <div className="flex flex-col gap-3 pb-20"> {/* pb-20 para dar espacio si tienes bottom navigation */}
            {customers.map((customer) => (
                <div
                    key={customer.id}
                    onClick={() => onRowClick && onRowClick(customer)}
                    className="relative flex flex-col p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-transform duration-100 cursor-pointer"
                >
                    {/* --- CABECERA: Avatar y Nombre --- */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-full font-bold text-lg border border-blue-100">
                                {customer.name.charAt(0)}
                            </div>

                            {/* Info Principal */}
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                                    {customer.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    {customer.email || "Sin correo"}
                                </p>
                            </div>
                        </div>

                        {/* Indicador de "Ver más" */}
                        <ChevronRight className="text-gray-300 w-5 h-5" />
                    </div>

                    {/* --- DETALLES: Grid de info --- */}
                    <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 dark:text-gray-300 mb-4 border-t border-b border-gray-50 dark:border-gray-800 py-3">
                        {/* Empleado */}
                        <div className="flex items-center gap-2">
                            <Briefcase size={14} className="text-gray-400" />
                            <span className="truncate max-w-[120px]">
                                {customer.employee?.name || "Sin asignar"}
                            </span>
                        </div>

                        {/* Fecha */}
                        <div className="flex items-center gap-2 justify-end text-gray-400 text-xs">
                            <Calendar size={14} />
                            <span>{new Date(customer.createdAt).toLocaleDateString('es-MX')}</span>
                        </div>
                    </div>

                    {/* --- ACCIONES: Botón de WhatsApp grande y cómodo --- */}
                    <div>
                        {customer.phone ? (
                            <a
                                href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()} // Detiene el evento para no abrir el modal de edición
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-50 text-green-700 rounded-lg font-medium border border-green-200 hover:bg-green-100 transition-colors"
                            >
                                <Phone size={16} />
                                <span>WhatsApp ({customer.phone})</span>
                            </a>
                        ) : (
                            <div className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-sm">
                                <span>Sin teléfono</span>
                            </div>
                        )}
                    </div>

                </div>
            ))}
        </div>
    );
}
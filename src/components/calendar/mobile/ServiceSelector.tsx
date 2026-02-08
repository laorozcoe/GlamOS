import React from 'react';
import { Minus, Plus, Check } from 'lucide-react'; // Asegúrate de tener esto o usa texto

export const ServiceSelector = ({
    services,
    servicesCategories,
    selectedCategory,
    setSelectedCategory,
    onAddService,
    onRemoveService, // <--- NUEVO: Función para restar
    appointments,    // <--- NUEVO: Lista actual para contar
    onClose,         // <--- NUEVO: Para el botón de "Listo"
    flashCategory
}: any) => {

    // Helper para contar cuántas veces está seleccionado un servicio
    const getServiceCount = (serviceId: any) => {
        if (!appointments) return 0;
        return appointments.filter((a: any) => a.id === serviceId).length;
    };

    return (
        <div className=" flex flex-col relative">

            {/* Header Sticky: Categorías */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-20 py-2 border-b border-gray-100 dark:border-gray-800 mb-2">
                <div className="flex justify-start gap-2 pb-2 overflow-x-auto custom-scrollbar px-1">
                    <button
                        className={`border px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${!selectedCategory ? 'bg-black text-white border-black' : 'dark:text-gray-300'}`}
                        onClick={() => setSelectedCategory("")}
                    >
                        Todos
                    </button>
                    {servicesCategories.map((cat: any) => (
                        <button
                            key={cat.id}
                            className={`border px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors 
                                ${selectedCategory === cat.id
                                    ? "bg-black text-white border-black"
                                    : "hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"}`}
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de Servicios */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 px-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {services
                        .filter((s: any) => !selectedCategory || s.categoryId === selectedCategory)
                        .map((ss: any) => {
                            const count = getServiceCount(ss.id);
                            const isSelected = count > 0;

                            return (
                                <div
                                    key={ss.id}
                                    className={`relative group border rounded-xl transition-all duration-200 overflow-hidden
                                        ${flashCategory === ss.id ? 'ring-2 ring-black scale-95 bg-gray-50' : ''}
                                        ${isSelected
                                            ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800 shadow-md ring-1 ring-black/5 dark:ring-white/10'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-sm bg-white dark:bg-gray-900'}
                                    `}
                                >
                                    {/* Botón Principal (Añadir) */}
                                    <button
                                        onClick={() => onAddService(ss)}
                                        className="w-full text-left p-3 pb-8 h-full flex flex-col"
                                    >
                                        <div className="font-bold text-sm truncate dark:text-white leading-tight mb-1">{ss.name}</div>
                                        <div className="text-xs text-gray-500 font-medium">${ss.price}</div>
                                    </button>

                                    {/* CONTROLES FLOTANTES (Solo aparecen si está seleccionado) */}
                                    {isSelected && (
                                        <div className="absolute bottom-0 left-0 w-full p-2 flex justify-between items-center bg-gray-100/80 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 fade-in">

                                            {/* Botón Restar */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Evita que se active el click de añadir
                                                    onRemoveService(ss.id);
                                                }}
                                                className="h-6 w-6 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm border border-gray-200 dark:border-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                                            >
                                                <Minus size={14} />
                                            </button>

                                            {/* Contador Central */}
                                            <span className="font-bold text-sm mx-2 dark:text-white">
                                                {count}
                                            </span>

                                            {/* Botón Sumar (Pequeño visual) */}
                                            <button
                                                onClick={() => onAddService(ss)}
                                                className="h-6 w-6 flex items-center justify-center bg-black text-white dark:bg-white dark:text-black rounded-full shadow-sm hover:scale-110 transition-transform"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    )}

                                    {/* Badge de Cantidad (Esquina superior derecha) */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 bg-black text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center shadow-sm animate-bounce-short">
                                            {count}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Footer Flotante "LISTO" (Solo si se pasa onClose) */}
            {onClose && (
                <div className="absolute bottom-4 left-0 w-full px-4 z-30">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold shadow-xl hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
                    >
                        <Check size={18} />
                        Listo ({appointments ? appointments.length : 0})
                    </button>
                </div>
            )}
        </div>
    );
};
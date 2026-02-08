// components/booking/ServiceSelector.tsx
import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';

export const ServiceSelector = ({
    services,
    servicesCategories,
    selectedCategory,
    setSelectedCategory,
    onAddService,
    onRemoveService,
    appointments,
    onClose,
    flashCategory
}: any) => {

    const getServiceCount = (serviceId: any) => {
        if (!appointments) return 0;
        return appointments.filter((a: any) => a.id === serviceId).length;
    };

    return (
        <div className="h-full flex flex-col relative bg-white dark:bg-gray-900">

            {/* --- CATEGORÍAS (Igual que antes) --- */}
            <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-20 py-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex flex-wrap justify-center  items-center gap-2 my-2 overflow-x-auto custom-scrollbar">
                    <button
                        className={`border px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${!selectedCategory ? 'bg-black text-white border-black' : 'text-gray-600 border-gray-200'}`}
                        onClick={() => setSelectedCategory("")}
                    >
                        Todos
                    </button>
                    {servicesCategories.map((cat: any) => (
                        <button
                            key={cat.id}
                            className={`border px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all 
                                ${selectedCategory === cat.id
                                    ? "bg-black text-white border-black"
                                    : "text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- GRID DE SERVICIOS --- */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-28">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {services
                        .filter((s: any) => !selectedCategory || s.categoryId === selectedCategory)
                        .map((ss: any) => {
                            const count = getServiceCount(ss.id);
                            const isSelected = count > 0;

                            return (
                                <div
                                    key={ss.id}
                                    // Quitamos el onClick del contenedor padre para evitar conflictos con los botones grandes
                                    className={`
            relative group flex flex-row items-center justify-between
            border rounded-2xl p-0 h-32 overflow-hidden bg-white
            transition-all duration-200 select-none
            ${flashCategory === ss.id ? 'ring-2 ring-black bg-gray-50' : ''}
            ${isSelected
                                            ? 'border-black shadow-md ring-1 ring-black/5'
                                            : 'border-gray-200 hover:border-gray-300'}
        `}
                                >
                                    {/* --- IZQUIERDA: INFORMACIÓN (Click aquí selecciona/agrega) --- */}
                                    <div
                                        onClick={() => onAddService(ss)}
                                        className="flex-1 flex flex-col justify-center h-full p-4 pr-2 cursor-pointer"
                                    >
                                        <h4 className={`text-sm font-bold leading-tight line-clamp-2 ${isSelected ? 'text-black' : 'text-gray-700'}`}>
                                            {ss.name}
                                        </h4>
                                        <span className="text-xs text-gray-500 mt-1 font-medium">
                                            ${ss.price}
                                        </span>
                                    </div>

                                    {/* --- DERECHA: CONTROLES ASIDE (Verticales y Grandes) --- */}
                                    {isSelected ? (
                                        <div className="h-full w-14 bg-black text-white flex flex-col items-center justify-between py-2 animate-in slide-in-from-right-4 duration-200">
                                            {/* Botón MÁS (Arriba) - Área táctil grande */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onAddService(ss);
                                                }}
                                                className="flex-1 w-full flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
                                            >
                                                <Plus size={20} strokeWidth={3} />
                                            </button>

                                            {/* Contador (Centro) */}
                                            <span className="text-sm font-bold tabular-nums py-1">
                                                {count}
                                            </span>

                                            {/* Botón MENOS (Abajo) - Área táctil grande */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRemoveService(ss.id);
                                                }}
                                                className="flex-1 w-full flex items-center justify-center hover:bg-gray-800 active:bg-gray-700 transition-colors"
                                            >
                                                <Minus size={20} strokeWidth={3} />
                                            </button>
                                        </div>
                                    ) : (
                                        /* Botón inicial de agregar (Grande y visible) */
                                        <button
                                            onClick={() => onAddService(ss)}
                                            className="h-full w-12 flex items-center justify-center border-l border-gray-100 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-400 hover:text-black transition-colors"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* --- BOTÓN FLOTANTE 'LISTO' --- */}
            {onClose && (
                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-white via-white to-transparent z-30 pointer-events-none flex justify-center">
                    <button
                        onClick={onClose}
                        className="pointer-events-auto w-full max-w-md py-4 bg-black text-white text-sm font-bold rounded-2xl shadow-xl transform active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <span>Confirmar Servicios</span>
                        {appointments && appointments.length > 0 && (
                            <span className="bg-white text-black px-2 py-0.5 rounded-md text-xs">
                                {appointments.length}
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};
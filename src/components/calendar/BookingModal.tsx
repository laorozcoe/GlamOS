import React from "react";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import InputField from '@/components/form/input/InputField';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEditing: boolean;

    // Datos y Estados
    employees: any[];
    services: any[];
    servicesCategories: any[];
    selectedCategory: string | null;
    setSelectedCategory: (id: string) => void;
    selectedEmployee: any;
    setSelectedEmployee: (val: any) => void;
    customer: { name: string; phone: string };
    handleChangeCustomer: (e: any) => void;
    date: string; setDate: (v: string) => void;
    time: string; setTime: (v: string) => void;
    paymentStatus?: string; // <--- NUEVO
    // Carrito
    appointments: any[];
    onAddService: (s: any) => void;
    onDeleteService: (idx: number) => void;
    total: number;
    flashCategory: string | null;

    // Acciones
    onSave: () => void;
    onOpenPay: () => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
    isOpen, onClose, isEditing, paymentStatus = "UNPAID",
    employees, services, servicesCategories,
    selectedCategory, setSelectedCategory,
    selectedEmployee, setSelectedEmployee,
    customer, handleChangeCustomer,
    date, setDate, time, setTime,
    appointments, onAddService, onDeleteService, total, flashCategory,
    onSave, onOpenPay
}) => {
    // Helper booleano
    const isPaid = paymentStatus === "PAID";

    // Helper para select de empleados
    const employeeOptions = employees.map((e: any) => ({
        value: e.id,
        label: `${e.user.name} ${e.user.lastName}`
    }));

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-full max-w-6xl h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        >
            {/* HEADER */}
            <div className="flex-none px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
                <div>
                    <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                        {isEditing ? "Editar Cita" : "Nueva Cita"}
                    </h5>
                    <p className="text-sm text-gray-500">Detalles de la agenda</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
            </div>

            {/* BODY */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

                {/* IZQUIERDA: INPUTS Y SERVICIOS */}
                <div className="w-full lg:w-8/12 h-full overflow-y-auto custom-scrollbar p-6">

                    {/* Formulario Cliente/Empleado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-sm font-bold block mb-1">Empleado</label>
                            <Select
                                options={employeeOptions}
                                placeholder="Seleccionar..."
                                value={selectedEmployee?.id || selectedEmployee || ""}
                                onChange={(val) => {
                                    const emp = employees.find((e: any) => String(e.id) === val);
                                    setSelectedEmployee(emp || val);
                                }}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-sm font-bold block mb-1">Teléfono</label>
                                <InputField name="phone" value={customer.phone} type="number" onChange={handleChangeCustomer} />
                            </div>
                            <div>
                                <label className="text-sm font-bold block mb-1">Nombre</label>
                                <InputField name="name" value={customer.name} onChange={handleChangeCustomer} />
                            </div>
                        </div>
                    </div>

                    {/* Selector de Servicios */}
                    <div className=" top-0 bg-white dark:bg-gray-900 z-10 py-2">
                        <div className="flex justify-start gap-2 pb-2 overflow-x-auto">
                            <button
                                className={`border px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${!selectedCategory ? 'bg-black text-white' : ''}`}
                                onClick={() => setSelectedCategory("")}
                            >
                                Todos
                            </button>
                            {servicesCategories.map((cat: any) => (
                                <button
                                    key={cat.id}
                                    className={`border px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors 
                                ${selectedCategory === cat.id ? "bg-black text-white" : "hover:bg-gray-100"}`}
                                    onClick={() => setSelectedCategory(cat.id)}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grid de Servicios */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {services
                            .filter((s: any) => !selectedCategory || s.categoryId === selectedCategory)
                            .map((ss: any) => (
                                <button
                                    key={ss.id}
                                    onClick={() => onAddService(ss)}
                                    className={`p-3 border rounded-lg text-left transition-all duration-150 ease-in-out
                            ${flashCategory === ss.id ? 'ring-2 ring-black scale-95 bg-gray-50' : 'hover:shadow-md'}
                        `}
                                >
                                    <div className="font-bold text-sm truncate">{ss.name}</div>
                                    <div className="text-xs text-gray-500">${ss.price}</div>
                                </button>
                            ))}
                    </div>
                </div>

                {/* DERECHA: RESUMEN Y PAGO */}
                <div className="w-full lg:w-4/12 h-full bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-700 grid grid-rows-[auto_1fr_auto]">

                    {/* Fecha y Hora */}
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold mb-2 text-gray-800 dark:text-white">Fecha y Hora</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full text-sm" />
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-2 rounded w-full text-sm" />
                        </div>
                    </div>

                    {/* Lista del Carrito */}
                    <div className="overflow-y-auto p-4 space-y-2">
                        {appointments.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                <span className="text-2xl mb-2">🛒</span>
                                <span className="text-sm">Sin servicios</span>
                            </div>
                        ) : (
                            appointments.map((apt: any, index: number) => (
                                <div key={index} className="bg-white p-3 rounded shadow-sm border border-gray-200 flex justify-between items-center text-sm animate-in fade-in slide-in-from-bottom-2">
                                    <div className="overflow-hidden pr-2">
                                        <p className="font-bold truncate">{apt.name}</p>
                                        <p className="text-xs text-gray-500">${apt.price}</p>
                                    </div>
                                    <button onClick={() => onDeleteService(index)} className="text-gray-400 hover:text-red-500 px-2 font-bold">✕</button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer Totales */}
                    {isPaid ? (
                        <div className="w-full py-3 bg-green-100 border border-green-200 text-green-800 rounded-xl text-center font-bold flex items-center justify-center gap-2">
                            ✅ Esta cita ya fue pagada
                        </div>
                    ) : (
                        <div className="p-5 bg-white border-t border-gray-200 z-10 shadow-lg">
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-gray-500 text-sm font-medium">Total Estimado</span>
                                <span className="text-3xl font-black text-gray-900">${total}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={onSave} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-colors">
                                    {isEditing ? "Actualizar" : "Guardar"}
                                </button>
                                <button onClick={onOpenPay} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                                    Pagar 💵
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
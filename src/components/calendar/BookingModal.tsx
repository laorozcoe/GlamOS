
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import InputField from '@/components/form/input/InputField';
import { ServiceSelector } from "@/components/calendar/mobile/ServiceSelector"; // Tu nuevo componente
import { ServiceModal } from "@/components/calendar/mobile/ServiceModal";       // Tu nuevo submodal

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


export const BookingModal: React.FC<BookingModalProps> = (props) => {
    // Desestructuramos props para facilitar uso
    const {
        isOpen, onClose, isEditing, paymentStatus = "UNPAID",
        employees, selectedEmployee, setSelectedEmployee,
        customer, handleChangeCustomer,
        date, setDate, time, setTime,
        appointments, onDeleteService, total,
        onSave, onOpenPay
    } = props;

    const handleRemoveInstance = (serviceId: any) => {
        // Buscamos el índice de la ÚLTIMA ocurrencia de este servicio
        const indexToRemove = [...appointments].reverse().findIndex((a: any) => a.id === serviceId);

        if (indexToRemove !== -1) {
            // Ajustamos el índice porque usamos reverse()
            const realIndex = appointments.length - 1 - indexToRemove;
            onDeleteService(realIndex);
        }
    };
    // ESTADO PARA EL SUBMODAL
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

    const isPaid = paymentStatus === "PAID";

    const employeeOptions = employees.map((e: any) => ({
        value: e.id,
        label: `${e.user.name} ${e.user.lastName}`
    }));

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                className="w-[95svw] max-w-6xl h-[90svh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* HEADER */}
                <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center">
                    <div>
                        <h5 className="text-xl font-bold text-gray-800 dark:text-white">
                            {isEditing ? "Editar Cita" : "Nueva Cita"}
                        </h5>
                        <p className="text-sm text-gray-500 hidden sm:block">Gestiona los detalles de la agenda</p>
                    </div>
                </div>

                {/* BODY CONTAINER */}
                <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">

                    {/* COLUMNA IZQUIERDA (Inputs + Servicios en Desktop) */}
                    <div className="w-full sm:w-8/12 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900">

                        {/* 1. SECCION FORMULARIO (Scrollable) */}
                        <div className="p-6 overflow-y-auto flex-none sm:flex-1">
                            {/* Inputs Empleado / Cliente */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                            {/* Inputs Fecha (Visible en móvil aquí para mejor flujo) */}
                            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-100 sm:hidden">
                                <div>
                                    <label className="text-sm font-bold block mb-1">Fecha</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full text-sm bg-gray-50" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold block mb-1">Hora</label>
                                    <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-2 rounded w-full text-sm bg-gray-50" />
                                </div>
                            </div>
                            {/* BOTON MÓVIL PARA ABRIR SUBMODAL */}
                            <div className="mt-6 sm:hidden">
                                <button
                                    onClick={() => setIsServiceModalOpen(true)}
                                    className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                                >
                                    <span className="text-xl">+</span> Agregar Servicios
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-2">
                                    {appointments.length} servicios seleccionados
                                </p>
                            </div>

                            {/* COMPONENTE SELECTOR (SOLO DESKTOP) */}
                            <div className="hidden sm:block mt-6 h-full min-h-[400px]">
                                <h3 className="font-bold mb-3">Seleccionar Servicios</h3>
                                <ServiceSelector
                                    services={props.services}
                                    servicesCategories={props.servicesCategories}
                                    selectedCategory={props.selectedCategory}
                                    setSelectedCategory={props.setSelectedCategory}
                                    onAddService={props.onAddService}
                                    flashCategory={props.flashCategory}
                                />
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA (Resumen / Carrito) */}
                    <div className="w-full sm:w-4/12 h-auto sm:h-full bg-gray-50 dark:bg-gray-800/50 border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 flex flex-col max-h-[50vh] sm:max-h-full">

                        {/* Fecha y Hora (Solo Desktop - en movil ya lo pusimos arriba) */}
                        <div className="p-5 border-b border-gray-200 dark:border-gray-700 hidden sm:block">
                            <h3 className="font-bold mb-2 text-gray-800 dark:text-white">Fecha y Hora</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-2 rounded w-full text-sm" />
                                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-2 rounded w-full text-sm" />
                            </div>
                        </div>

                        {/* LISTA CARRITO (Flexible) */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0 bg-gray-100/50">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 sm:hidden">Resumen de Cita</h3>

                            {appointments.length === 0 ? (
                                <div className="h-20 sm:h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                    <span className="text-sm">Carrito vacío</span>
                                </div>
                            ) : (
                                appointments.map((apt: any, index: number) => (
                                    <div key={index} className="bg-white p-3 rounded shadow-sm border border-gray-200 flex justify-between items-center text-sm">
                                        <div className="overflow-hidden pr-2">
                                            <p className="font-bold truncate text-gray-800">{apt.name}</p>
                                            <p className="text-xs text-gray-500">${apt.price}</p>
                                        </div>
                                        <button onClick={() => onDeleteService(index)} className="text-red-300 hover:text-red-500 px-2">✕</button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* FOOTER TOTALES */}
                        {isPaid ? (
                            <div className="p-4">
                                <div className="w-full py-3 bg-green-100 border border-green-200 text-green-800 rounded-xl text-center font-bold">
                                    ✅ Pagada
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-white border-t border-gray-200 shadow-sm safe-area-pb">
                                <div className="flex justify-between items-end mb-3">
                                    <span className="text-gray-500 text-sm font-medium">Total</span>
                                    <span className="text-2xl font-black text-gray-900">${total}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={onSave} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black">
                                        {isEditing ? "Actualizar" : "Agendar"}
                                    </button>
                                    <button onClick={onOpenPay} className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                                        Pagar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <ServiceModal
                isOpen={isServiceModalOpen}
                onClose={() => setIsServiceModalOpen(false)}
                // Pasamos todas las props necesarias para el selector
                services={props.services}
                servicesCategories={props.servicesCategories}
                selectedCategory={props.selectedCategory}
                setSelectedCategory={props.setSelectedCategory}
                onAddService={(s: any) => {
                    props.onAddService(s);
                    // Opcional: cerrar modal al seleccionar uno, o dejarlo abierto para seleccionar varios
                    // setIsServiceModalOpen(false); 
                }}
                flashCategory={props.flashCategory}
                appointments={appointments}       // <--- Lista actual
                onRemoveService={handleRemoveInstance} // <--- Función para restar
            />

        </>
    );
};
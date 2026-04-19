import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import InputField from '@/components/form/input/InputField';
import { ServiceSelector } from "@/components/calendar/mobile/ServiceSelector";
import Button from "../ui/button/Button";
import { Trash, User, Calendar, Sparkles, Receipt, ChevronRight, ChevronLeft, SquarePlus, Search, Check, X, Tag } from 'lucide-react';
import Label from "@/components/form/Label";

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEditing: boolean;
    employees: any[];
    services: any[];
    customers: any[];
    servicesCategories: any[];
    selectedCategory: string | null;
    setSelectedCategory: (id: string) => void;
    selectedEmployee: any;
    setSelectedEmployee: (val: any) => void;
    customer: { name: string; phone: string };
    handleChangeCustomer: (e: any) => void;
    date: string; setDate: (v: string) => void;
    time: string; setTime: (v: string) => void;
    timeEnd: string; setTimeEnd: (v: string) => void;
    paymentStatus?: string;
    appointments: any[];
    onAddService: (s: any) => void;
    onDeleteService: (idx: number) => void;
    onDeleteAppointment: () => void;
    setCustomer: (customer: any) => void;
    total: number;
    flashCategory: string | null;
    onSave: () => void;
    onOpenPay: () => void;
    setExtraServicesModal: (val: boolean) => void;
    isAdmin?: boolean;
    canCreateAppointments?: boolean;
    onResolveGhost?: (id: string, approve: boolean) => void;
}

export const BookingModal: React.FC<BookingModalProps> = (props) => {
    const {
        isOpen, onClose, isEditing, paymentStatus = "UNPAID",
        employees, selectedEmployee, setSelectedEmployee,
        customer, handleChangeCustomer,
        date, setDate, time, setTime, timeEnd, setTimeEnd,
        appointments, onDeleteService, total,
        onSave, onOpenPay, onDeleteAppointment, setExtraServicesModal,
        customers, setCustomer, isAdmin, canCreateAppointments, onResolveGhost
    } = props;

    // --- ESTADOS ---
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [isServiceBrowserOpen, setIsServiceBrowserOpen] = useState(false);

    // --- HELPERS ---
    const employeeOptions = employees.map((e: any) => ({
        value: e.id,
        label: `${e.user.name} ${e.user.lastName}`
    }));

    const handleRemoveInstance = (serviceId: any) => {
        const indexToRemove = [...appointments].reverse().findIndex((a: any) => a.serviceId === serviceId);
        if (indexToRemove !== -1) {
            const realIndex = appointments.length - 1 - indexToRemove;
            onDeleteService(realIndex);
        }
    };

    const handleSelectCustomer = (customer: any) => {
        setCustomer(customer)
        setIsSearchModalOpen(false);
    }

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                className="w-[95svw] max-w-3xl sm:max-w-7xl h-[95svh] md:h-[85svh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col p-0"
                showCloseButton={true}
            >
                {/* --- HEADER --- */}
                <div className="flex-none px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-between items-center z-20">
                    <div>
                        <Label className="text-xl sm:text-2xl font-black leading-tight">
                            {isEditing ? "Detalle de Cita" : "Nueva Cita"}
                        </Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {isEditing ? "Visualiza y edita los detalles de la visita." : "Llena los datos para programar un servicio."}
                        </p>
                    </div>
                </div>

                {/* --- BODY SCROLL --- */}
                <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4 md:p-6 bg-white dark:bg-gray-900 lg:grid lg:grid-cols-12 lg:gap-8">

                    <div className="lg:col-span-7 lg:overflow-y-auto custom-scrollbar lg:pr-2 pb-4 lg:pb-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 lg:mb-0">

                            {/* Bloque 1: Especialista */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-4 flex items-center gap-2">
                                    <User size={18} className="text-brand-500" /> Especialista
                                </Label>
                                <div>
                                    <Select
                                        className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-brand-500 dark:text-white"
                                        options={employeeOptions}
                                        placeholder="Seleccionar especialista..."
                                        value={selectedEmployee?.id || selectedEmployee || ""}
                                        onChange={(val) => {
                                            const emp = employees.find((e: any) => String(e.id) === val);
                                            setSelectedEmployee(emp || val);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Bloque 2: Fecha y Hora */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-4 flex items-center gap-2">
                                    <Calendar size={18} className="text-brand-500" /> Fecha y Horario
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <Label className="text-xs font-medium mb-1.5 block text-gray-500 dark:text-gray-400">Día</Label>
                                        <InputField type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium mb-1.5 block text-gray-500 dark:text-gray-400">Inicio</Label>
                                        <InputField type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium mb-1.5 block text-gray-500 dark:text-gray-400">Fin</Label>
                                        <InputField type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Bloque 3: Cliente (Ocupa 2 columnas en desktop) */}
                            <div className="md:col-span-2 bg-gray-50 dark:bg-gray-800/30 p-4 md:p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-4 flex items-center gap-2">
                                    <User size={18} className="text-brand-500" /> Datos del Cliente
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                                    <div>
                                        <Label className="text-xs font-medium mb-1.5 block text-gray-500 dark:text-gray-400">Teléfono</Label>
                                        <InputField className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white" name="phone" value={customer.phone} type="number" onChange={handleChangeCustomer} placeholder="10 dígitos" />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-medium mb-1.5 block text-gray-500 dark:text-gray-400">Nombre</Label>
                                        <InputField className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm dark:text-white" name="name" value={customer.name} onChange={handleChangeCustomer} placeholder="Nombre completo" />
                                    </div>


                                    <Button
                                        onClick={() => setIsSearchModalOpen(true)}
                                        type="button"
                                        variant="outline"
                                        className="h-[46px] px-6 rounded-xl border-gray-300 dark:border-gray-600 flex items-center gap-2 text-sm font-bold"
                                    >
                                        <Search size={16} /> <span className="hidden sm:inline">Buscar</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloque 4: Servicios */}
                    <div className="lg:col-span-5 border-t border-gray-100 dark:border-gray-800 pt-6 lg:border-t-0 lg:border-l lg:pl-8 lg:pt-0 lg:flex lg:flex-col lg:h-full lg:overflow-hidden">
                        <div className="flex-none flex flex-col xl:flex-row justify-between items-start xl:items-center mb-5 gap-3">
                            <Label className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Tag size={20} className="text-brand-500" /> Servicios ({appointments.length})
                            </Label>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={() => setExtraServicesModal(true)}
                                    className="px-4 py-2 border-brand-200 text-brand-600 hover:bg-brand-50 flex-1 sm:flex-none dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-900/30"
                                >
                                    + Servicio Extra
                                </Button>
                                <Button
                                    onClick={() => setIsServiceBrowserOpen(true)}
                                    className="px-5 py-2 flex-1 sm:flex-none bg-brand-500 hover:bg-brand-600 shadow-md"
                                >
                                    + Catálogo
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 lg:overflow-y-auto custom-scrollbar space-y-3 lg:pr-2 lg:pb-6">
                            {appointments.length === 0 ? (
                                <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
                                    <Sparkles className="mb-2 opacity-50" size={24} />
                                    <span className="text-sm font-medium">El ticket está vacío</span>
                                </div>
                            ) : (
                                appointments.map((apt: any, index: number) => (
                                    <div key={index} className={`p-4 rounded-xl shadow-sm border flex justify-between items-center transition-all ${apt.isPending
                                        ? 'border-orange-400 border-dashed bg-orange-50/50 dark:bg-orange-900/20'
                                        : apt.isPendingRemove
                                            ? 'border-red-200 border-dashed bg-red-50/30 opacity-70 dark:bg-red-900/10'
                                            : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                                        }`}>
                                        <div className="overflow-hidden pr-2">
                                            <Label className="font-bold flex items-center flex-wrap gap-2 dark:text-white">
                                                <span className={apt.isPendingRemove ? "line-through text-gray-500" : ""}>{apt.name}</span>
                                                {apt.isPending && (
                                                    <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md font-bold tracking-wider border border-orange-200">
                                                        Esperando Autorización
                                                    </span>
                                                )}
                                                {apt.isPendingRemove && (
                                                    <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-md font-bold tracking-wider border border-red-200">
                                                        Pendiente Quitar
                                                    </span>
                                                )}
                                            </Label>
                                            <div className="flex gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                                                <Label className={apt.isPendingRemove ? "line-through" : "text-brand-600 dark:text-brand-400 font-bold"}>${apt.price}</Label>
                                                <Label className={apt.isPendingRemove ? "line-through" : ""}>• {apt.duration} min</Label>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 ml-4">
                                            {isAdmin && (apt.isPending || apt.isPendingRemove) && apt.requestId ? (
                                                <>
                                                    <button onClick={() => onResolveGhost && onResolveGhost(apt.requestId, false)} className="w-9 h-9 flex items-center justify-center text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors" title="Rechazar">
                                                        <X size={18} />
                                                    </button>
                                                    <button onClick={() => onResolveGhost && onResolveGhost(apt.requestId, true)} className="w-9 h-9 flex items-center justify-center text-green-600 bg-green-50 rounded-full hover:bg-green-100 transition-colors" title="Aprobar">
                                                        <Check size={18} />
                                                    </button>
                                                </>
                                            ) : (
                                                <button onClick={() => onDeleteService(index)} className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                                                    <Trash size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                    </div>
                </div>

                <div className="flex-none p-4 md:p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex flex-col md:flex-row justify-between items-center gap-4 z-20">
                    <div className="w-full md:w-auto flex justify-between md:justify-start items-center gap-6">
                        <div>
                            <Label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">Costo Estimado</Label>
                            <Label className="text-3xl font-black text-gray-900 dark:text-white">${total.toLocaleString()}</Label>
                        </div>
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-3 w-full md:w-auto">
                        {isAdmin && isEditing && (
                            <Button variant="outline" className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20" onClick={() => setIsDeleteModalOpen(true)}>
                                Eliminar
                            </Button>
                        )}
                        {canCreateAppointments && (
                            <Button onClick={onSave} variant="outline" className="flex-1 md:flex-none font-bold">
                                {isEditing ? "Guardar" : "Agendar"}
                            </Button>
                        )}

                        {isAdmin && (
                            <Button onClick={onOpenPay} className="w-full md:w-auto px-8 bg-green-600 hover:bg-green-700 shadow-lg text-white font-bold">
                                Cobrar Ahora
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Sub-Modal: Selector de Catálogo */}
            <Modal isOpen={isServiceBrowserOpen} onClose={() => setIsServiceBrowserOpen(false)} className="w-[95svw] max-w-lg sm:max-w-7xl h-[90svh] p-0 overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-gray-900" showCloseButton={true}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 text-center">
                    <Label className="font-bold text-lg dark:text-white">Catálogo de Servicios</Label>
                    <p className="text-xs text-gray-500 mt-1">Busca y añade servicios al ticket</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/50">
                    <ServiceSelector
                        services={props.services}
                        servicesCategories={props.servicesCategories}
                        selectedCategory={props.selectedCategory}
                        setSelectedCategory={props.setSelectedCategory}
                        onAddService={(service: any) => {
                            props.onAddService(service);
                            // Opcional: Cerrar el modal al agregar, o dejarlo abierto para agregar varios.
                            // setIsServiceBrowserOpen(false); 
                        }}
                        flashCategory={props.flashCategory}
                        appointments={appointments}
                        onRemoveService={handleRemoveInstance}
                    />
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <Button className="w-full py-3" onClick={() => setIsServiceBrowserOpen(false)}>Hecho</Button>
                </div>
            </Modal>

            {/* Modal Eliminar */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-sm p-6 rounded-2xl bg-white dark:bg-gray-900">
                <Label className="text-lg font-bold mb-2 dark:text-white">¿Eliminar cita?</Label>
                <Label className="text-gray-500 text-sm mb-6 block">Esta acción borrará la cita del calendario. No se puede deshacer.</Label>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => { onDeleteAppointment(); setIsDeleteModalOpen(false); }}>Eliminar</Button>
                </div>
            </Modal>

            {/* Search Customer */}
            <Modal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} className="max-w-sm p-6 rounded-2xl bg-white dark:bg-gray-900">
                <Label className="text-lg font-bold mb-5 block dark:text-white">Buscar cliente</Label>
                <ul className="mb-6 overflow-y-auto max-h-[50vh] md:h-[300px] divide-y divide-gray-100 dark:divide-gray-800 overscroll-contain custom-scrollbar">
                    {customers.map((cc: any) => (
                        <li
                            onClick={() => handleSelectCustomer(cc)}
                            key={cc.id}
                            className="py-3 px-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                        >
                            <Label color="text-brand-600 dark:text-brand-400 group-hover:text-brand-700 font-bold block">{cc.name}</Label>
                            <Label color="text-gray-500 text-sm">{cc.phone}</Label>
                        </li>
                    ))}
                    {customers.length === 0 && (
                        <div className="py-6 text-center text-gray-500 text-sm">No hay clientes registrados</div>
                    )}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => setIsSearchModalOpen(false)}>Cerrar</Button>
            </Modal>
        </>
    );
};
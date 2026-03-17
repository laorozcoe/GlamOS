import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import InputField from '@/components/form/input/InputField';
import { ServiceSelector } from "@/components/calendar/mobile/ServiceSelector";
// Ya no necesitamos el ServiceModal aparte, lo integraremos en el flujo
import Button from "../ui/button/Button";
import { Trash, User, Calendar, Sparkles, Receipt, ChevronRight, ChevronLeft, SquarePlus, Search } from 'lucide-react';
import Label from "@/components/form/Label";

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    isEditing: boolean;
    // ... Tus props (sin cambios)
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
}

export const BookingModal: React.FC<BookingModalProps> = (props) => {
    const {
        isOpen, onClose, isEditing, paymentStatus = "UNPAID",
        employees, selectedEmployee, setSelectedEmployee,
        customer, handleChangeCustomer,
        date, setDate, time, setTime, timeEnd, setTimeEnd,
        appointments, onDeleteService, total,
        onSave, onOpenPay, onDeleteAppointment, setExtraServicesModal,
        customers, setCustomer
    } = props;

    useEffect(() => {
        if (!isOpen) {
            setMobileTab('services');
        }
    }, [isOpen]);

    // --- ESTADOS ---
    const [mobileTab, setMobileTab] = useState<'info' | 'services' | 'summary'>('services');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

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
                className="w-[95svw] h-[95svh] sm:w-[95svw] sm:max-w-6xl sm:h-[90svh] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* --- HEADER --- */}
                <div className="flex-none px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center z-20">
                    <div className="flex items-center gap-3">
                        {/* Botón Back solo en móvil si no estamos en la primera tab */}
                        <button
                            className={`sm:hidden p-1 -ml-2 text-gray-500 ${mobileTab === 'services' ? 'hidden' : ''}`}
                            onClick={() => setMobileTab(mobileTab === 'summary' ? 'info' : 'services')}
                        >
                            <ChevronLeft />
                        </button>
                        <div>
                            <Label className="text-lg sm:text-xl font-bold leading-tight mb-5">
                                {isEditing ? "Editar Cita" : "Nueva Cita"}
                            </Label>
                            <p className="text-xs text-brand-500 font-medium sm:hidden">
                                {mobileTab === 'services' && "Paso 1: Servicios"}
                                {mobileTab === 'info' && "Paso 2: Datos"}
                                {mobileTab === 'summary' && "Paso 3: Confirmar"}
                            </p>
                        </div>
                    </div>
                    {/* <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button> */}
                </div>

                {/* --- BODY --- */}
                <div className="flex-1 overflow-hidden relative">

                    {/* VISTA MÓVIL: TABS CONDICIONALES */}
                    <div className="sm:hidden h-full flex flex-col">
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                            {/* --- TAB 1: SERVICIOS (Aquí estaba el bug) --- */}
                            {/* Al estar inline, React mantiene el DOM y el scroll */}
                            {mobileTab === 'services' && (
                                <div className="h-full flex flex-col">
                                    {/* En móvil, el ServiceSelector debe ocupar todo el alto */}
                                    <div className="flex-1 min-h-0">
                                        <ServiceSelector
                                            services={props.services}
                                            servicesCategories={props.servicesCategories}
                                            selectedCategory={props.selectedCategory}
                                            setSelectedCategory={props.setSelectedCategory}
                                            onAddService={props.onAddService}
                                            flashCategory={props.flashCategory}
                                            appointments={appointments}
                                            onRemoveService={handleRemoveInstance}
                                        />
                                    </div>
                                </div>
                            )}
                            {/* --- TAB 2: INFO --- */}
                            {mobileTab === 'info' && (
                                <div className="space-y-5 p-1">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Label className="text-sm font-bold  uppercase mb-3 flex items-center gap-2">
                                            <User size={18} /> Datos Empleado
                                        </Label>
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium mb-1 block">Nombre</Label>
                                                <Select
                                                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm"
                                                    options={employeeOptions}
                                                    placeholder="Seleccionar..."
                                                    value={selectedEmployee?.id || selectedEmployee || ""}
                                                    onChange={(val) => {
                                                        const emp = employees.find((e: any) => String(e.id) === val);
                                                        setSelectedEmployee(emp || val);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Label className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                            <User size={18} /> Datos Cliente
                                        </Label>
                                        <div className="space-y-4">
                                            {/* 1. Cambiamos las columnas y agregamos 'items-end' para que el botón se alinee con los inputs y no con los labels */}
                                            <div className="grid grid-cols-1 gap-3 items-end">
                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Teléfono</Label>
                                                    <InputField className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" name="phone" value={customer.phone} type="number" onChange={handleChangeCustomer} />
                                                </div>

                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Nombre</Label>
                                                    <InputField className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" name="name" value={customer.name} onChange={handleChangeCustomer} />
                                                </div>

                                                {/* 1. Usamos h-[42px] para que mida exactamente lo mismo que el InputField */}
                                                {/* 2. Usamos flex, items-center y justify-center para centrar el ícono de la lupa adentro del botón */}
                                                <Button
                                                    onClick={() => setIsSearchModalOpen(true)}
                                                    type="button"
                                                    className="h-[43px] flex items-center justify-center p-0 align-middle"
                                                >
                                                    <span>Buscar cliente</span>
                                                    <Search size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Label className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                            <Calendar size={18} /> Fecha y Hora
                                        </Label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <Label className="text-sm font-medium mb-1 block">Día</Label>
                                                <InputField type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Inicio</Label>
                                                    <InputField type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Fin</Label>
                                                    <InputField type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}



                            {/* --- TAB 3: RESUMEN --- */}
                            {mobileTab === 'summary' && (
                                <div className="flex flex-col h-full">
                                    <div className="flex-1 overflow-y-auto space-y-3 p-1">
                                        {appointments.length === 0 ? (
                                            <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                                <Sparkles className="mb-2 opacity-50" />
                                                <span className="text-sm">No hay servicios seleccionados</span>
                                                <button onClick={() => setMobileTab('services')} className="text-brand-500 text-sm font-bold mt-2 underline">Ir a agregar</button>
                                            </div>
                                        ) : (
                                            appointments.map((apt: any, index: number) => (
                                                <div key={index} className="bg-white dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                                    <div className="overflow-hidden pr-2">
                                                        <Label className="font-bold">{apt.name}</Label>
                                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                            <Label>${apt.price}</Label>
                                                            <Label>• {apt.duration} min</Label>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => onDeleteService(index)}
                                                        className="w-8 h-8 flex items-center justify-center  text-red-400 rounded-full hover:bg-red-100 transition-colors"
                                                    >
                                                        <Trash size={18} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Total Block */}

                                    <div className="mt-4  py-3">
                                        <div className="flex justify-between align-middle text-center items-center rounded-xl border border-gray-200 py-2 px-5">
                                            <Label color="text-gray-500 dark:text-brand-400" className="font-medium">Total Estimado</Label>
                                            <Label color="text-gray-500 dark:text-brand-400" className="text-3xl font-black text-gray-900">${total}</Label>
                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>
                    </div>

                    {/* VISTA DESKTOP: Mantenemos el Split View */}
                    <div className="hidden sm:flex h-full">
                        <div className="w-8/12 p-6 overflow-y-auto border-r border-gray-100">
                            {/* Copiamos el JSX de Info aquí */}
                            <div className="space-y-5 p-1">
                                <div className="flex gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Label className="text-sm font-bold uppercase mb-3 flex items-center gap-2">
                                            <User size={18} /> Datos Empleado
                                        </Label>
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm font-medium mb-1 block">Nombre</Label>
                                                <Select
                                                    className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm"
                                                    options={employeeOptions}
                                                    placeholder="Seleccionar..."
                                                    value={selectedEmployee?.id || selectedEmployee || ""}
                                                    onChange={(val) => {
                                                        const emp = employees.find((e: any) => String(e.id) === val);
                                                        setSelectedEmployee(emp || val);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Label className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                            <User size={18} /> Datos Cliente
                                        </Label>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Teléfono</Label>
                                                    <InputField className="border-gray-300 bg-white" name="phone" value={customer.phone} type="number" onChange={handleChangeCustomer} />
                                                </div>
                                                <div>
                                                    <Label className="text-sm font-medium mb-1 block">Nombre</Label>
                                                    <InputField className="border-gray-300 bg-white" name="name" value={customer.name} onChange={handleChangeCustomer} />
                                                </div>
                                                <Button
                                                    onClick={() => setIsSearchModalOpen(true)}
                                                    type="button"
                                                    className="h-[43px] flex items-center justify-center p-0 align-middle"
                                                >

                                                    <Search size={18} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <Label className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                        <Calendar size={18} /> Fecha y Hora
                                    </Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium mb-1 block">Día</Label>
                                            <InputField type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-sm font-medium mb-1 block">Inicio</Label>
                                                <InputField type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                            </div>
                                            <div>
                                                <Label className="text-sm font-medium mb-1 block">Fin</Label>
                                                <InputField type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="h-125">
                                <Label className="font-bold mb-3">Seleccionar Servicios</Label>
                                <ServiceSelector
                                    services={props.services}
                                    servicesCategories={props.servicesCategories}
                                    selectedCategory={props.selectedCategory}
                                    setSelectedCategory={props.setSelectedCategory}
                                    onAddService={props.onAddService}
                                    flashCategory={props.flashCategory}
                                    appointments={appointments}
                                    onRemoveService={handleRemoveInstance}
                                />
                            </div>
                        </div>
                        <div className="w-4/12   flex flex-col ">
                            <div className="dark:bg-gray-800/50 py-3 px-3">
                                <Label color={"text-white dark:text-gray-400"} className="font-bold mb-4 ">Resumen</Label>
                            </div>
                            {/* Copia de la lógica de Resumen */}
                            <div className="flex-1 overflow-y-auto space-y-3 py-3 px-3">
                                {appointments.length === 0 ? (
                                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                                        <Sparkles className="mb-2 opacity-50" />
                                        <span className="text-sm">No hay servicios seleccionados</span>
                                        <button onClick={() => setMobileTab('services')} className="text-brand-500 text-sm font-bold mt-2 underline">Ir a agregar</button>
                                    </div>
                                ) : (
                                    appointments.map((apt: any, index: number) => (
                                        <div key={index} className=" p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                            <div className="overflow-hidden pr-2">
                                                <Label className="font-bold">{apt.name}</Label>
                                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                    <Label>${apt.price}</Label>
                                                    <Label>• {apt.duration} min</Label>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onDeleteService(index)}
                                                className="w-8 h-8 flex items-center justify-center  text-red-400 rounded-full hover:bg-red-100 transition-colors"
                                            >
                                                <Trash size={18} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="mt-4  py-3 px-3">
                                <div className="flex justify-between align-middle text-center items-center rounded-xl border border-gray-200 py-2 px-5">
                                    <Label color="text-gray-500 dark:text-brand-400" className="font-medium">Total Estimado</Label>
                                    <Label color="text-gray-500 dark:text-brand-400" className="text-3xl font-black text-gray-900">${total}</Label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- FOOTER (ACCIONES) --- */}
                <div className="flex-none p-4 border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                    {/* FOOTER MÓVIL */}
                    <div className="flex sm:hidden gap-3">
                        {mobileTab === 'info' && (
                            <Button className="w-full flex justify-between" onClick={() => setMobileTab('summary')}>
                                <span>Subtotal</span> <ChevronRight size={18} />
                            </Button>
                        )}

                        {mobileTab === 'services' && (
                            <div className="w-full flex gap-2">
                                <div className="flex-1 flex flex-col justify-center px-2">
                                    <Label className="text-xs ">Total</Label>
                                    <Label className="font-bold text-lg">${total}</Label>
                                </div>
                                <Button className="flex-1" onClick={() => setMobileTab('info')}>
                                    Siguiente ({appointments.length})
                                </Button>
                            </div>
                        )}

                        {mobileTab === 'summary' && (
                            <div className="w-full flex flex-col gap-2">
                                <div className="flex gap-2 w-full">
                                    {isEditing && (
                                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(true)}>
                                            <Trash size={18} />
                                        </Button>
                                    )}
                                    <Button onClick={onSave} className="flex-1 bg-brand-500">
                                        {isEditing ? "Actualizar" : "Agendar Cita"}
                                    </Button>
                                </div>
                                <div className="gap-2 flex">
                                    <Button onClick={() => setExtraServicesModal(true)} variant="outline" className=" bg-green-600 hover:bg-green-700">
                                        <SquarePlus />
                                    </Button>
                                    <Button onClick={onOpenPay} className="w-full bg-green-600 hover:bg-green-700">
                                        Cobrar Ahora
                                    </Button>
                                </div>

                            </div>
                        )}
                    </div>

                    {/* FOOTER DESKTOP */}
                    <div className="hidden sm:flex justify-end gap-3">
                        {isEditing && (
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(true)}>
                                Eliminar Cita
                            </Button>
                        )}
                        <Button onClick={onSave} className="px-8">
                            {isEditing ? "Guardar Cambios" : "Crear Cita"}
                        </Button>
                        <Button onClick={() => setExtraServicesModal(true)} variant="outline" className="">
                            <SquarePlus />
                        </Button>
                        <Button onClick={onOpenPay} className="bg-green-600 hover:bg-green-700 px-8">
                            Cobrar
                        </Button>
                    </div>
                </div>
            </Modal >

            {/* Modal Eliminar */}
            < Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setMobileTab('services') }} className="max-w-sm p-6 rounded-2xl" >
                <h3 className="text-lg font-bold mb-2">¿Eliminar cita?</h3>
                <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => { onDeleteAppointment(); setIsDeleteModalOpen(false); }}>Eliminar</Button>
                </div>
            </Modal >

            {/* Search Customer */}
            < Modal isOpen={isSearchModalOpen} onClose={() => { setIsSearchModalOpen(false); setMobileTab('services') }} className="max-w-sm p-6 rounded-2xl" >
                <Label className="text-lg font-bold mb-7">Buscar cliente</Label>
                <ul className="mb-6 overflow-y-auto max-h-[50vh] md:h-[200px] rounded-xl divide-y divide-gray-700/50 overscroll-contain shadow-inner">
                    {customers.map((cc: any) => (
                        <li
                            onClick={() => handleSelectCustomer(cc)}
                            key={cc.id}
                            className="py-3 px-4 active:bg-gray-700/50 transition-colors"
                        >
                            <Label color={"text-brand-500 dark:text-brand-400"}>{cc.name}</Label>
                            <Label>{cc.phone}</Label>
                        </li>
                    ))}
                </ul>
                <div className="flex gap-3">
                    <Button className="flex-1 bg-brand-600 hover:bg-red-700 text-white" onClick={() => { onDeleteAppointment(); setIsSearchModalOpen(false); }}>Cerrar</Button>
                </div>
            </Modal >
        </>
    );
};
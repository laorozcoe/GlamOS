'use client'
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";
import InputField from '@/components/form/input/InputField';
import { ServiceSelector } from "@/components/calendar/mobile/ServiceSelector";
// Ya no necesitamos el ServiceModal aparte, lo integraremos en el flujo
import Button from "@/components/ui/button/Button";
import { Trash, User, Calendar, Sparkles, Receipt, ChevronRight, ChevronLeft } from 'lucide-react';
import { useCalendarLogic } from '@/components/calendar/useCalendar'

export default function BlankPage(props) {
    const logic = useCalendarLogic();
    const isOpen = logic.isOpen;
    const onClose = logic.closeModal;
    const isEditing = !!logic.selectedEvent;
    const employees = logic.employees;
    const services = logic.services;
    const servicesCategories = logic.servicesCategories;
    const appointments = logic.appointments;
    const total = logic.total;
    const selectedEvent = logic.selectedEvent;
    const date = logic.date;
    const setDate = logic.setDate;
    const time = logic.time;
    const setTime = logic.setTime;
    const customer = logic.customer;
    const handleChangeCustomer = logic.handleChangeCustomer;
    const selectedEmployee = logic.selectedEmployee;
    const setSelectedEmployee = logic.setSelectedEmployee;
    const selectedCategory = logic.selectedCategory;
    const setSelectedCategory = logic.setSelectedCategory;
    const flashCategory = logic.flashCategory;
    const paymentStatus = logic.selectedEvent?.extendedProps?.paymentStatus || "UNPAID";
    const timeEnd = logic.timeEnd;
    const setTimeEnd = logic.setTimeEnd;
    const onAddService = logic.addServiceToCart;
    const onDeleteService = logic.removeServiceFromCart;
    const onSave = logic.handleSaveOrUpdate;
    const onOpenPay = () => logic.setShowPayModal(true);
    const onDeleteAppointment = logic.onDeleteAppointment;

    // --- ESTADOS ---
    const [mobileTab, setMobileTab] = useState('info');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // --- HELPERS ---
    const isPaid = paymentStatus === "PAID";
    const employeeOptions = employees.map((e) => ({
        value: e.id,
        label: `${e.user.name} ${e.user.lastName}`
    }));

    const handleRemoveInstance = (serviceId) => {
        const indexToRemove = [...appointments].reverse().findIndex((a) => a.id === serviceId);
        if (indexToRemove !== -1) {
            const realIndex = appointments.length - 1 - indexToRemove;
            onDeleteService(realIndex);
        }
    };

    // --- COMPONENTES INTERNOS (Para ordenar el código) ---

    // 1. SECCIÓN INFORMACIÓN (Cliente, Empleado, Fecha)
    const InfoSection = () => (
        <div className="space-y-5 p-1">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <User size={14} /> Datos Personales
                </h4>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Empleado</label>
                        <Select
                            options={employeeOptions}
                            placeholder="Seleccionar..."
                            value={selectedEmployee?.id || selectedEmployee || ""}
                            onChange={(val) => {
                                const emp = employees.find((e) => String(e.id) === val);
                                setSelectedEmployee(emp || val);
                            }}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Teléfono</label>
                            <InputField name="phone" value={customer.phone} type="number" onChange={handleChangeCustomer} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Nombre</label>
                            <InputField name="name" value={customer.name} onChange={handleChangeCustomer} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <Calendar size={14} /> Fecha y Hora
                </h4>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Día</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Inicio</label>
                            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Fin</label>
                            <input type="time" value={timeEnd} onChange={e => setTimeEnd(e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-300 bg-white text-sm" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // 2. SECCIÓN SERVICIOS (El Selector)
    const ServicesSection = () => (
        <div className="h-full flex flex-col">
            {/* En móvil, el ServiceSelector debe ocupar todo el alto */}
            <div className="flex-1 min-h-0">
                {/* <ServiceSelector
                    services={props.services}
                    servicesCategories={props.servicesCategories}
                    selectedCategory={props.selectedCategory}
                    setSelectedCategory={props.setSelectedCategory}
                    onAddService={props.onAddService}
                    flashCategory={props.flashCategory}
                    // Pasamos props extra para permitir restar desde aquí si el componente lo soporta
                    appointments={appointments}
                    onRemoveService={handleRemoveInstance}
                /> */}
            </div>
        </div>
    );

    // 3. SECCIÓN RESUMEN (Carrito y Total)
    const SummarySection = () => (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
                {appointments.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <Sparkles className="mb-2 opacity-50" />
                        <span className="text-sm">No hay servicios seleccionados</span>
                        <button onClick={() => setMobileTab('services')} className="text-brand-500 text-sm font-bold mt-2 underline">Ir a agregar</button>
                    </div>
                ) : (
                    appointments.map((apt, index) => (
                        <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="overflow-hidden pr-2">
                                <p className="font-bold text-gray-800">{apt.name}</p>
                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                    <span>${apt.price}</span>
                                    <span>• {apt.duration} min</span>
                                </div>
                            </div>
                            <button
                                onClick={() => onDeleteService(index)}
                                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-100 transition-colors"
                            >
                                <Trash size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Total Block */}
            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                <div className="flex justify-between items-end">
                    <span className="text-gray-500 font-medium">Total Estimado</span>
                    <span className="text-3xl font-black text-gray-900">${total}</span>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <div>
                <PageBreadcrumb pageTitle="Nueva Venta" />
                <div className=" rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                    <div className="flex items-center gap-3">
                        {/* Botón Back solo en móvil si no estamos en la primera tab */}
                        <button
                            className={`sm:hidden p-1 -ml-2 text-gray-500 ${mobileTab === 'info' ? 'hidden' : ''}`}
                            onClick={() => setMobileTab(mobileTab === 'summary' ? 'services' : 'info')}
                        >
                            <ChevronLeft />
                        </button>
                        <div>
                            {/* En móvil mostramos en qué paso estamos */}
                            <p className="text-xs text-brand-500 font-medium sm:hidden">
                                {mobileTab === 'info' && "Paso 1: Datos"}
                                {mobileTab === 'summary' && "Paso 2: Confirmar"}
                            </p>
                        </div>
                    </div>
                    {/* --- BODY --- */}
                    <div className="flex-1 overflow-hidden relative">

                        {/* VISTA MÓVIL: TABS CONDICIONALES */}
                        <div className="sm:hidden h-full flex flex-col">
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                {mobileTab === 'info' && <InfoSection />}
                                {mobileTab === 'services' && <ServicesSection />}
                                {mobileTab === 'summary' && <SummarySection />}
                            </div>
                        </div>

                        {/* VISTA DESKTOP: Mantenemos el Split View */}
                        <div className="hidden sm:flex">
                            <div className="w-8/12 p-6 overflow-y-auto border-r border-gray-100">
                                {/* <div className="mb-6">
                                    <InfoSection />
                                </div> */}
                                <div className="h-[500px]">
                                    <h3 className="font-bold mb-3">Seleccionar Servicios</h3>
                                    <ServicesSection />
                                </div>
                            </div>
                            <div className="w-4/12 p-6 bg-gray-50/50 flex flex-col">
                                <h3 className="font-bold mb-4">Resumen</h3>
                                {/* Copia de la lógica de Resumen */}
                                <SummarySection />
                            </div>
                        </div>
                    </div>

                    {/* --- FOOTER (ACCIONES) --- */}
                    <div className="flex-none p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                        {/* FOOTER MÓVIL */}
                        <div className="flex sm:hidden gap-3">
                            {mobileTab === 'info' && (
                                <Button className="w-full flex justify-between" onClick={() => setMobileTab('services')}>
                                    <span>Siguiente: Servicios</span> <ChevronRight size={18} />
                                </Button>
                            )}

                            {mobileTab === 'services' && (
                                <div className="w-full flex gap-2">
                                    <div className="flex-1 flex flex-col justify-center px-2">
                                        <span className="text-xs text-gray-500">Total</span>
                                        <span className="font-bold text-lg">${total}</span>
                                    </div>
                                    <Button className="flex-1" onClick={() => setMobileTab('summary')}>
                                        Ver Resumen ({appointments.length})
                                    </Button>
                                </div>
                            )}

                            {mobileTab === 'summary' && (
                                <div className="w-full flex flex-col gap-2">
                                    <Button onClick={onOpenPay} className="w-full bg-green-600 hover:bg-green-700">
                                        Cobrar Ahora
                                    </Button>
                                </div>
                            )}
                        </div>
                        {/* FOOTER DESKTOP */}
                        <div className="hidden sm:flex justify-end gap-3">
                            <Button onClick={onOpenPay} className="bg-green-600 hover:bg-green-700 px-8">
                                Cobrar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-sm p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-2">¿Eliminar cita?</h3>
                <p className="text-gray-500 text-sm mb-6">Esta acción no se puede deshacer.</p>
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                    <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => { onDeleteAppointment(); setIsDeleteModalOpen(false); }}>Eliminar</Button>
                </div>
            </Modal>
        </>

    );
}



// interface BookingModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     isEditing: boolean;
//     // ... Tus props (sin cambios)
//     employees: any[];
//     services: any[];
//     servicesCategories: any[];
//     selectedCategory: string | null;
//     setSelectedCategory: (id: string) => void;
//     selectedEmployee: any;
//     setSelectedEmployee: (val: any) => void;
//     customer: { name: string; phone: string };
//     handleChangeCustomer: (e: any) => void;
//     date: string; setDate: (v: string) => void;
//     time: string; setTime: (v: string) => void;
//     timeEnd: string; setTimeEnd: (v: string) => void;
//     paymentStatus?: string;
//     appointments: any[];
//     onAddService: (s: any) => void;
//     onDeleteService: (idx: number) => void;
//     onDeleteAppointment: () => void;
//     total: number;
//     flashCategory: string | null;
//     onSave: () => void;
//     onOpenPay: () => void;
// }

// export const BookingModal: React.FC<BookingModalProps> = () => {

//     return (
//         <>
//             <Modal
//                 isOpen={isOpen}
//                 onClose={onClose}
//                 className="w-[95svw] h-[95svh] sm:w-[95svw] sm:max-w-6xl sm:h-[90svh] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
//             >

//             </Modal>

//             {/* Modal Eliminar */}

//         </>
//     );
// };

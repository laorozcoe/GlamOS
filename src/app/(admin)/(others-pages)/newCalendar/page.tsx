"use client"
import { BookingModal } from "@/components/calendar/BookingModal";
import { PaymentModal } from "@/components/calendar/PaymentModal";
import { SaleDetailsModal } from "@/components/calendar/SaleDetailsModal";
import { useCalendarLogic } from "@/components/calendar/useCalendar";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import InputField from "@/components/form/input/InputField";
import Button from "@/components/ui/button/Button";
import { toast } from "react-toastify";

// --- CONFIGURACIÓN ---
const START_HOUR = 9;
const END_HOUR = 18;
const HOUR_HEIGHT = 80; // Altura de cada hora en pixeles

// --- DATOS MOCK (Simulados) ---
const columns = [
    { id: 1, name: 'Estación 1 (Uñas)' },
    { id: 2, name: 'Estación 2 (Cabello)' },
    { id: 3, name: 'Estación 3 (Pestañas)' },
];
const colors: Record<string, string> = {
    "3c620a80-d3d2-4d83-92a4-de8cf6311a58": 'bg-blue-100 border-blue-300 text-blue-700',
    "a73cec98-b3c6-42c3-8f3a-63b766bca6a1": 'bg-purple-100 border-purple-300 text-purple-700',
    "cd0d0b76-50ad-4051-840d-c442d6a5d1ed": 'bg-pink-100 border-pink-300 text-pink-700',
}

// Aquí definimos las citas manualmente para probar el empalme
const appointments = [
    // Cita Normal (1 hora)
    {
        id: 'cita-1',
        colId: 1,
        title: 'Manicure Gel',
        start: '09:00',
        duration: 60, // minutos
        color: 'bg-blue-100 border-blue-300 text-blue-700',
        width: '100%', left: '0%'
    },
    // --- EL EMPALME (Overlapping) ---
    // Cita 2: Empieza 10:30 (Choca con la de abajo)
    {
        id: 'cita-2',
        colId: 2,
        title: 'Corte Dama',
        start: '10:30',
        duration: 60,
        color: 'bg-purple-100 border-purple-300 text-purple-700',
        // width: '50%', left: '0%' // Ocupa la mitad izquierda
        width: '100%', left: '0%'
    },
    // Cita 3: Empieza 11:00 (Choca con la de arriba)
    {
        id: 'cita-3',
        colId: 3,
        title: 'Tinte Raíz',
        start: '11:00',
        duration: 90,
        color: 'bg-pink-100 border-pink-300 text-pink-700',
        // width: '50%', left: '50%' // Ocupa la mitad derecha
        width: '100%', left: '0%'
    },

];

const formatTime = (dateInput: any) => {
    const date = new Date(dateInput);

    return new Intl.DateTimeFormat('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false // Cambia a true si prefieres "02:30 PM" en lugar de "14:30"
    }).format(date);
}

// --- HELPER PARA POSICIONAR ---
const getPositionStyles = (startTimeString: any, durationMinutes: any) => {
    const [hours, minutes] = startTimeString.split(':').map(Number);

    // 1. Calcular cuántos minutos han pasado desde el inicio del calendario (9:00 AM)
    const startInMinutes = (hours - START_HOUR) * 60 + minutes;

    // 2. Convertir minutos a pixeles
    // (Pixeles por hora / 60 minutos) * minutos transcurridos
    const top = (startInMinutes / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    return { top: `${top}px`, height: `${height}px` };
};

const getDurationInMinutes = (start: any, end: any) => {
    // 1. Asegurarnos de que ambas variables sean objetos Date
    const startDate = new Date(start);
    const endDate = new Date(end);

    // 2. Restar las fechas usando getTime() para mayor seguridad
    const diffInMilliseconds = endDate.getTime() - startDate.getTime();

    // 3. Convertir los milisegundos a minutos
    const diffInMinutes = diffInMilliseconds / 60000;

    // 4. Devolver un número entero
    return Math.round(diffInMinutes);
    // Nota: Usa Math.floor(diffInMinutes) si prefieres descartar los segundos 
    // incompletos en lugar de redondear hacia arriba.
}

export default function CalendarGrid() {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
    const logic = useCalendarLogic();
    return (

        <>
            <PageBreadcrumb pageTitle="Calendario" />
            <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/3 xl:px-10 xl:py-12">
                {/* HEADER */}
                <div className="flex justify-center gap-2 mb-2">
                    <Button children={"<"} onClick={() => { logic.handleUpdateDate(-1) }}></Button>
                    <InputField type="date" value={logic.currentDate} onChange={(e) => logic.setCurrentDate(e.target.value)} />
                    <Button children=">" onClick={() => { logic.handleUpdateDate(1) }}></Button>
                </div>
                <div className="flex-none bg-gray-50 border-b border-gray-200 z-20">
                    <div className="grid" style={{ gridTemplateColumns: `60px repeat(${logic.employees.length}, 1fr)` }}>
                        <div className="p-3 border-r border-gray-200"></div>
                        {logic.employees.map((employee) => (
                            <div key={employee.id} className="p-3 text-center font-bold text-gray-700 border-r border-gray-200 last:border-r-0">
                                {employee.user.name}
                            </div>
                        ))}
                    </div>
                </div>
                {/* BODY CON SCROLL */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    <div className="relative min-h-[640px]"> {/* Altura mínima para que no se corte */}

                        {/* 1. GRILLA DE FONDO (Horas y Medias Horas) */}
                        {/* 1. GRILLA DE FONDO (Horas y Medias Horas) */}
                        {hours.map((hour) => (
                            <div key={hour} className="flex border-b border-gray-100" style={{ height: `${HOUR_HEIGHT}px` }}>

                                {/* Columna de la Hora */}
                                <div className="w-[60px] flex-none border-r border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-center pt-2 relative">
                                    <span className=" bg-gray-50 px-1">{hour}:00</span>
                                </div>

                                {/* Columnas de Fondo (Celdas Vacías) */}
                                {logic.employees.map((employee) => (
                                    <div
                                        key={employee.id}
                                        // 1. Agregamos cursor pointer y hover para indicar que es clickeable
                                        className="flex-1 border-r border-gray-100 relative last:border-r-0 cursor-pointer hover:bg-blue-50/30 transition-colors"
                                        // 2. Aquí está la magia del Click
                                        onClick={(e) => {
                                            // Obtenemos la altura del click relativo a este div
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const y = e.clientY - rect.top; // Posición Y dentro de la celda (0 a 80px)

                                            // Si el click fue más abajo de la mitad (40px), son las :30, si no, :00
                                            const isHalfHour = y > (HOUR_HEIGHT / 2);
                                            const minutes = isHalfHour ? '30' : '00';

                                            // Formateamos la hora para que se vea bonita (ej. 09:30)
                                            const formattedHour = hour.toString().padStart(2, '0');
                                            const timeString = `${formattedHour}:${minutes}`;

                                            logic.handleDateClick(employee, timeString);
                                            toast.success(`📅 Nueva Cita\n👤 Estilista: ${employee.user.name}\n⏰ Hora: ${timeString}`);
                                            // alert(`📅 Nueva Cita\n👤 Estilista: ${employee.user.name}\n⏰ Hora: ${timeString}`);
                                        }}
                                    >
                                        {/* LÍNEA DE MEDIA HORA (Dashed) */}
                                        <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-gray-200 pointer-events-none"></div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* 2. CAPA DE EVENTOS (Flotando encima) */}
                        <div className="absolute top-0 left-0 w-full h-full pointer-events-none pl-[60px] flex">
                            {/* Renderizamos una "columna contenedor" transparente por cada estación */}
                            {logic.employees.map((employee: any) => (
                                <div key={employee.id} className="flex-1 relative border-r border-transparent last:border-r-0">

                                    {/* Filtramos las citas que pertenecen a esta columna */}
                                    {logic.events
                                        .filter(event => event.employeeId === employee.id)
                                        .map(event => {
                                            const pos = getPositionStyles(formatTime(event.start), getDurationInMinutes(event.start, event.end));

                                            return (
                                                <div
                                                    key={event.id}
                                                    className={`absolute p-2 rounded-md border-l-4 shadow-sm text-xs font-medium cursor-pointer hover:brightness-95 pointer-events-auto transition-all ${colors[event.employeeId]}`}
                                                    // className={`absolute p-2 rounded-md border-l-4 shadow-sm text-xs font-medium cursor-pointer hover:brightness-95 pointer-events-auto transition-all`}
                                                    style={{
                                                        top: pos.top,
                                                        height: pos.height,
                                                        width: "100%",  // 50% si hay empalme
                                                        left: "0%",    // 0% o 50% según el empalme
                                                        zIndex: 10         // Para que quede encima de las líneas
                                                    }}
                                                    onClick={() => logic.handleEventClick(event)}
                                                >
                                                    <div className="font-bold">{event.title}</div>
                                                    <div className="opacity-80">{formatTime(event.start)} - {getDurationInMinutes(event.start, event.end)}m</div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* MODAL DE AGENDA */}
            <BookingModal
                isOpen={logic.isOpen}
                onClose={logic.closeModal}
                isEditing={!!logic.selectedEvent}

                // Data Passing
                employees={logic.employees}
                services={logic.services}
                servicesCategories={logic.servicesCategories}
                appointments={logic.appointments}
                total={logic.total}
                paymentStatus={logic.selectedEvent?.extendedProps?.paymentStatus || "UNPAID"}

                // State Passing
                date={logic.date} setDate={logic.setDate}
                time={logic.time} setTime={logic.setTime}
                customer={logic.customer} handleChangeCustomer={logic.handleChangeCustomer}
                selectedEmployee={logic.selectedEmployee} setSelectedEmployee={logic.setSelectedEmployee}
                selectedCategory={logic.selectedCategory} setSelectedCategory={logic.setSelectedCategory}
                flashCategory={logic.flashCategory}

                // Action Passing
                onAddService={logic.addServiceToCart}
                onDeleteService={logic.removeServiceFromCart}
                onSave={logic.handleSaveOrUpdate}
                onOpenPay={() => logic.setShowPayModal(true)}
                onDeleteAppointment={logic.onDeleteAppointment}
                timeEnd={logic.timeEnd} setTimeEnd={logic.setTimeEnd}
            />

            {/* MODAL DE PAGO */}
            <PaymentModal
                isOpen={logic.showPayModal}
                onClose={() => logic.setShowPayModal(false)}
                total={logic.total}
                onFinalize={logic.handleFinalizePayment}
            />

            {/* NUEVO: MODAL DE DETALLE DE VENTA (Solo se abre si ESTÁ pagado) */}
            <SaleDetailsModal
                isOpen={logic.showSaleDetails}
                onClose={() => logic.setShowSaleDetails(false)}
                event={logic.selectedEvent}
            />
        </>
    );
};
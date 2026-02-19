import { useState, useEffect, useRef, useMemo } from "react";
import { useModal } from "@/hooks/useModal";
import { useBusiness } from "@/context/BusinessContext";
import FullCalendar from "@fullcalendar/react";
import { usePrinter } from "@/hooks/usePrinter";
import {
    getEmployeesPrisma, getServicesPrisma, getServicesCategoriesPrisma,
    getAppointmentsPrisma, createAppointment, updateAppointment,
    createClientPrisma, getClientPrisma, createPaymentPrisma,
    createSalePrisma, deleteAppointmentPrisma,
    getAppointmentsByDatePrisma
} from "@/lib/prisma";
import { toast } from 'react-toastify';

export const useCalendarLogic = () => {
    const business = useBusiness();
    const { isOpen, openModal, closeModal } = useModal();
    const calendarRef = useRef<FullCalendar>(null);
    const [showSaleDetails, setShowSaleDetails] = useState(false); // <--- NUEVO ESTADO
    const { printTicket, device, connect } = usePrinter();

    // --- ESTADOS DE DATOS (CATÁLOGOS) ---
    const [employees, setEmployees] = useState<any[]>([]);
    const [servicesCategories, setServicesCategories] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    // Ref para evitar problemas de closure en hooks
    const servicesRef = useRef(services);

    // --- ESTADOS DEL FORMULARIO ---
    const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [timeEnd, setTimeEnd] = useState("");
    // ✅ Correcto: Usa tu hora local
    const [currentDate, setCurrentDate] = useState(new Date().toLocaleDateString('en-CA'));

    // Selecciones
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]); // Carrito de servicios
    const [extraServices, setExtraServices] = useState<any[]>([]); // Carrito de servicios
    const [extraServicesModal, setExtraServicesModal] = useState<boolean>(false); // Carrito de servicios
    const [customer, setCustomer] = useState({ name: "", phone: "" });

    // UI Helpers
    const [flashCategory, setFlashCategory] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);

    const handleShowPayModal = () => {
        debugger
         if (!time || !date) {
            toast.warning("Ingresa fecha y hora");
            return
        }
        if (appointments.length === 0) {
            toast.warning("Ingresa un servicio");
            return
        }
        if (selectedEmployee?.id == "" || selectedEmployee?.id == null) {
            toast.warning("Selecciona un empleado");
            return
        }
        setShowPayModal(true);
    }

    // --- CARGA INICIAL ---
    useEffect(() => {
        servicesRef.current = services;
    }, [services]);

    useEffect(() => {
        const loadCatalogs = async () => {
            if (!business?.id) return;
            try {
                const [emp, srv, cats, evts] = await Promise.all([
                    getEmployeesPrisma(business.id),
                    getServicesPrisma(business.id),
                    getServicesCategoriesPrisma(business.id),
                    getAppointmentsByDatePrisma(business.id, currentDate)
                ]);
                setEmployees(emp);
                setServices(srv);
                setServicesCategories(cats);
                setEvents(evts);
            } catch (error) {
                console.error("Error cargando catálogos:", error);
            }
        };
        loadCatalogs();
    }, [business?.id, currentDate]);

    // --- CÁLCULOS ---
    const total = useMemo(() => {
        return appointments.reduce((acc: any, curr: any) => acc + Number(curr.price), 0);
    }, [appointments]);

    // --- HANDLERS LÓGICOS ---

    const resetModalFields = () => {
        setAppointments([]);
        setSelectedCategory(null);
        setSelectedEmployee(null);
        setSelectedEvent(null);
        setCustomer({ name: "", phone: "" });
        setDate("");
        setTime("");
    };

    const handleNewEventButton = () => {
        resetModalFields();
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');

        // Siguiente hora en punto
        const nextHour = (now.getHours() + 1) % 24;

        setDate(`${year}-${month}-${day}`);
        setTime(`${String(nextHour).padStart(2, '0')}:00`);
        openModal();
    };

    const handleDateClick = (employee: any, timeString: string) => {
        // const handleDateClick = (arg: any) => {
        resetModalFields();
        // const start = arg.date;
        // const yyyy = start.getFullYear();
        // const mm = String(start.getMonth() + 1).padStart(2, '0');
        // const dd = String(start.getDate()).padStart(2, '0');
        // const hh = String(start.getHours()).padStart(2, '0');
        // const min = String(start.getMinutes()).padStart(2, '0');

        // setDate(`${yyyy}-${mm}-${dd}`);
        // setTime(`${hh}:${min}`);
        setDate(currentDate);
        setTime(timeString);
        setSelectedEmployee(employee);

        openModal();
    };

    const handleEventClick = (event: any) => {
        // const handleEventClick = (clickInfo: any) => {
        // const event = clickInfo.event;

        // 1. Recuperar info básica
        debugger
        setSelectedEvent(event); // Guardamos el evento original de FullCalendar


        // const status = event.extendedProps.paymentStatus; // Asegúrate que tu Prisma traiga esto
        const status = event.paymentStatus; // Asegúrate que tu Prisma traiga esto
        if (status === "PAID") {
            setShowSaleDetails(true);
        } else {

            // setSelectedEmployee(event.extendedProps.employee);
            setSelectedEmployee(event.employee);
            setCustomer({
                // name: event.extendedProps.guestName,
                name: event.guestName,
                // phone: event.extendedProps.guestPhone
                phone: event.guestPhone
            });

            // 2. Hidratar fechas
            if (event.start) {
                const yyyy = event.start.getFullYear();
                const mm = String(event.start.getMonth() + 1).padStart(2, '0');
                const dd = String(event.start.getDate()).padStart(2, '0');
                const hh = String(event.start.getHours()).padStart(2, '0');
                const min = String(event.start.getMinutes()).padStart(2, '0');
                setDate(`${yyyy}-${mm}-${dd}`);
                setTime(`${hh}:${min}`);
            }

            // 3. Hidratar servicios (Recuperar del catálogo o usar backup)
            // const appointmentServices = event.extendedProps.services || [];
            const appointmentServices = event.services || [];
            const currentCatalog = servicesRef.current;

            // const fullServices = appointmentServices.map((apptService: any) => {
            //     const catalogService = currentCatalog.find((s: any) => s.id === apptService.serviceId);
            //     return catalogService || apptService.service; // Fallback
            // }).filter(Boolean);

            const fullServices = appointmentServices.map((apptService: any) => {
                // 1. Intenta buscarlo en el catálogo (si tiene ID de servicio)
                // const catalogService = currentCatalog.find((s: any) => s.id === apptService.serviceId);
                
                // 2. Si está en el catálogo, úsalo
                // if (catalogService) return catalogService;

                // 3. Si viene poblado desde la DB (relación), úsalo
                if (apptService.service){
                    return {
                        id: apptService.id,  
                        name:apptService.service.name,
                        duration:apptService.service.duration,
                        price:apptService.price,
                        descriptionTicket: apptService.service.descriptionTicket,
                        serviceId: apptService.serviceId
                    };
                } 

                // 4. FALLBACK: Es un Servicio Extra (Manual)
                // Construimos un objeto "falso" que tenga la misma estructura que tus servicios
                return {
                    id: apptService.id,          // Usamos el ID de la relación para que React no se queje del key
                    name: "Servicio Extra",
                    duration: 0,                 // Duración por defecto
                    price: apptService.price,    // Usamos el precio que sí viene en el JSON (110)
                    descriptionTicket:"Servicio Extra",      // Nombre por defecto
                    isCustom: true               // (Opcional) Bandera por si quieres pintarlo diferente
                };
            }).filter(Boolean);

            setAppointments(fullServices);
            openModal();
        }

    };

    // Agregar servicio al carrito
    const addServiceToCart = (service: any) => {
        debugger
        setAppointments(prev => [...prev, service]);

        // Efecto visual flash
        setFlashCategory(service.id);

        setTimeout(() => setFlashCategory(null), 150);
    };

    const removeServiceFromCart = (indexToDelete: number) => {
        setAppointments(prev => prev.filter((_, i) => i !== indexToDelete));
    };

    // 2. Agrega este useEffect que "escucha" los cambios
    useEffect(() => {
        // Si no hay hora o fecha, no calculamos nada
        if (!date || !time) return;

        const calculateEndTime = () => {
            const startDateTime = new Date(`${date}T${time}:00`);

            // Sumamos la duración de todos los servicios en el estado actual
            const totalMinutes = appointments.reduce((sum: number, ap: any) => sum + (ap.duration || 30), 0);

            const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60000);

            // Formateo seguro usando padStart (corrige el bug del 10 que se convierte en 010)
            const hours = String(endDateTime.getHours()).padStart(2, '0');
            const minutes = String(endDateTime.getMinutes()).padStart(2, '0');

            setTimeEnd(`${hours}:${minutes}`);
        };

        calculateEndTime();

    }, [appointments, date, time]); // <--- Se ejecuta cuando cualquiera de estos cambia

    // Guardar / Actualizar
    const handleSaveOrUpdate = async () => {
        debugger
        if (!time || !date) {
            toast.warning("Ingresa fecha y hora");
            return
        }
        if (appointments.length === 0) {
            toast.warning("Ingresa un servicio");
            return
        }
        if (selectedEmployee?.id == "" || selectedEmployee?.id == null) {
            toast.warning("Selecciona un empleado");
            return
        }

        const startDateTime = new Date(`${date}T${time}:00`);
        const totalMinutes = appointments.reduce((sum: number, ap: any) => sum + (ap.duration || 30), 0);
        const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60000);

        // const serviceMap = appointments.map((item: any) => {
        //     if(item.id){
        //      item.serviceId = item.id;
        //     }
        //     return item;
        // });

        const payload = {
            businessId: business?.id,
            clientId: null, // O lógica de cliente real
            employeeId: selectedEmployee?.id || selectedEmployee, // Manejar si es obj o ID
            title: customer.name || "Cita",
            start: startDateTime,
            end: endDateTime,
            status: "PENDING",
            paymentStatus: "UNPAID",
            notes: "",
            guestName: customer.name,
            guestPhone: customer.phone,
            totalAmount: total,
            services: appointments
        };

        try {
            if (selectedEvent) {
                // Actualizar
                await updateAppointment(payload, selectedEvent.id);
            } else {
                // Crear
                await createAppointment(payload);
            }
            // Siempre asegurar cliente
            if (customer.name && customer.phone) {
                await createClientPrisma(business?.id, customer.name, customer.phone, "", "");
            }

            // Recargar eventos (idealmente optimista, pero aquí recargamos)
            // const newEvents = await getAppointmentsPrisma(business?.id);
            const newEvents = await getAppointmentsByDatePrisma(business?.id,currentDate);
            setEvents(newEvents);

        } catch (error) {
            console.error("Error guardando:", error);
        }

        closeModal();
        resetModalFields();
    };

    // Buscar cliente al escribir teléfono
    const handleChangeCustomer = async (e: any) => {
        const { name, value } = e.target;
        setCustomer(prev => ({ ...prev, [name]: value }));

        if (name === "phone" && value.length === 10) {
            try {
                const found = await getClientPrisma(business?.id, value);
                if (found) {
                    setCustomer(prev => ({ ...prev, name: found.name }));
                }
            } catch (e) { console.error(e); }
        }
    };

    // Procesar Pago Final
    const handleFinalizePayment = async (paymentData: any) => {
        debugger
        // 1. Validaciones iniciales
        if (!time || !date) {
            toast.warn("Ingresa fecha y hora");
            return
        }
        if (appointments.length === 0) {
            toast.warn("Ingresa un servicio");
            return
        }
        if (selectedEmployee?.id == "" || selectedEmployee?.id == null) {
            toast.warn("Selecciona un empleado");
            return
        }

        try {
            // 2. Cálculos de tiempo
            const startDateTime = new Date(`${date}T${time}:00`);
            const totalMinutes = appointments.reduce((sum: number, ap: any) => sum + (ap.duration || 30), 0);
            const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60000);

            // 3. Preparar Agrupación de Ítems (Para la Venta y el Ticket)
            const groupedItems = appointments.reduce((acc: any, appt: any) => {
                const key = appt.id || appt.name;
                if (!acc[key]) {
                    acc[key] = {
                        serviceId: appt.id || null,
                        quantity: 0,
                        ticket_desc: appt.descriptionTicket || appt.name,
                        name: appt.name,
                        unitPrice: Number(appt.price),
                        totalPrice: 0
                    };
                }
                acc[key].quantity += 1;
                acc[key].totalPrice += Number(appt.price);
                return acc;
            }, {});

            const itemsList = Object.values(groupedItems);

            // const serviceMap = appointments.map((item: any) => ({
            //     serviceId: item.id,
            //     price: item.price,
            // }));

            // 4. PASO A: Crear/Actualizar la Cita (Reserva de tiempo)
            const appointmentPayload = {
                businessId: business?.id,
                //TODO REVISAR ESTA PARTE PARA TRAER AL CLIENTE
                clientId: null,
                employeeId: selectedEmployee?.id || selectedEmployee,
                title: customer.name,
                start: startDateTime,
                end: endDateTime,
                status: "COMPLETED",
                paymentStatus: "PAID", // "PAID" (según tu Enum PaymentState)
                totalAmount: paymentData.total,
                // -------------------------------------

                notes: `Pago: ${paymentData.method}.`,
                guestName: customer.name,
                guestPhone: customer.phone,
                services: appointments
            };

            let currentAppointmentId = selectedEvent?.id;

            if (selectedEvent) {
                await updateAppointment(appointmentPayload, currentAppointmentId);
            } else {
                const newAppt = await createAppointment(appointmentPayload);
                currentAppointmentId = newAppt.id;
            }

            // 5. PASO B: Generar la VENTA (Sale) y sus Ítems (Snapshot)
            // Este es el nuevo query "en cascada" que definimos en el esquema

            const subtotal = appointments.reduce((sum, item) => sum + Number(item.price), 0);

            // 2. Definimos el descuento (por ahora en 0, o puedes traerlo de un input si lo agregas luego)
            const discount = 0;

            // 3. El total es lo que realmente se cobra
            const totalFinal = subtotal - discount;

            const totals = {
                subtotal,
                discount,
                total: totalFinal
            };

            const salePayload = {
                businessId: business?.id,
                clientId: null,
                employeeId: selectedEmployee?.id || selectedEmployee,
                appointmentId: currentAppointmentId, // Ligamos la venta a la cita
                totals: totals,
                items: itemsList.map((item: any) => ({
                    serviceId: item.serviceId,
                    description: item.ticket_desc,
                    price: item.unitPrice, // Guardamos precio unitario
                    quantity: item.quantity
                })),
                payment: {
                    amount: paymentData.total,
                    method: paymentData.method,
                    received: paymentData.received,
                    change: paymentData.change
                }
            };

            // Aquí llamas a tu nueva función de backend que hace la transacción de Prisma
            const saleResult = await createSalePrisma(salePayload);

            // 6. PASO C: Asegurar Cliente en BD
            if (customer.name && customer.phone) {
                await createClientPrisma(business?.id, customer.name, customer.phone, "", "");
            }
            // 7. PASO D: Impresión del Ticket (Usando datos de la venta recién creada)
            const ticketData = {
                businessName: business?.name || "Brillarte Bloom",
                folio: saleResult.sale.folio, // Usamos el folio real generado por la BD
                total: paymentData.total,
                paymentMethod: paymentData.method,
                received: paymentData.received,
                change: paymentData.change,
                // Formato: 07/02/2026
                date: saleResult.sale.createdAt.toLocaleDateString('es-MX'),
                // Formato: 04:27 AM (Formato 12h con am/pm para facilidad de lectura)
                time: saleResult.sale.createdAt.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                items: itemsList.map((item: any) => ({
                    quantity: item.quantity,
                    ticket_desc: item.ticket_desc,
                    price: item.totalPrice
                }))
            };

            await printTicket(ticketData);

            // 8. Limpieza y Refresco
            // const newEvents = await getAppointmentsPrisma(business?.id);
            const newEvents = await getAppointmentsByDatePrisma(business?.id, currentDate);
            setEvents(newEvents);

            setShowPayModal(false);
            closeModal();
            resetModalFields();
            toast.success("Venta procesada");

        } catch (error) {
            console.error("Error finalizando pago:", error);
            toast.error("Ocurrió un error al procesar la venta.");
        }
    };

    const onDelete = async () => {
        if (!selectedEvent) return;
        try {
            await deleteAppointmentPrisma(selectedEvent.id);
            closeModal();
            resetModalFields();
            // const newEvents = await getAppointmentsPrisma(business?.id);
            const newEvents = await getAppointmentsByDatePrisma(business?.id, currentDate);
            setEvents(newEvents);
        } catch (error) {
            console.error("Error eliminando cita:", error);
            toast.error("Ocurrió un error al eliminar la cita.");
        }
    };

    const handleUpdateDate = async (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate.toISOString().split('T')[0]);


        const rtnAppoin = await getAppointmentsByDatePrisma(business?.id, newDate.toISOString().split('T')[0]);
        setEvents(rtnAppoin);
    };

    return {
        calendarRef,
        isOpen, openModal, closeModal,
        employees, services, servicesCategories, events,
        date, setDate, time, setTime, timeEnd, setTimeEnd,
        selectedEvent, selectedCategory, setSelectedCategory,
        selectedEmployee, setSelectedEmployee,
        appointments, addServiceToCart, removeServiceFromCart,
        customer, handleChangeCustomer,
        total, currentDate, setCurrentDate, handleUpdateDate,
        flashCategory,
        showPayModal, setShowPayModal,
        handleNewEventButton, handleDateClick, handleEventClick,
        handleSaveOrUpdate, handleFinalizePayment,
        showSaleDetails, setShowSaleDetails,
        onDeleteAppointment: onDelete, handleShowPayModal,
        extraServices, setExtraServices,
        extraServicesModal, setExtraServicesModal
    };
};
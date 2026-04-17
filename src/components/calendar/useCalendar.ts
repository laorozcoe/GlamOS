import { useState, useEffect, useRef, useMemo } from "react";
import { useModal } from "@/hooks/useModal";
import { useBusiness } from "@/context/BusinessContext";
import FullCalendar from "@fullcalendar/react";
import { usePrinter } from "@/hooks/usePrinter";
import { useSession } from "@/lib/auth-client";
import {
    getEmployeesPrisma, getServicesPrisma, getServicesCategoriesPrisma,
    getAppointmentsPrisma, createAppointment, updateAppointment,
    createClientPrisma, getClientPrisma, getClientsPrisma, createPaymentPrisma,
    createSalePrisma, deleteAppointmentPrisma, getSaleByAppointmentPrisma,
    getAppointmentsByDatePrisma
} from "@/lib/prisma";
import { requestAppointmentModification, getPendingRequests } from "@/app/(admin)/(others-pages)/calendar/actions";
import { toast } from 'react-toastify';

export const useCalendarLogic = () => {
    const business = useBusiness();
    const { data: session } = useSession();
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
    const [customers, setCustomers] = useState<any[]>([]);

    // UI Helpers
    const [flashCategory, setFlashCategory] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);

    const handleShowPayModal = () => {
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

    const loadCatalogs = async () => {
        if (!business?.id) return;
        try {
            const [emp, srv, cats, evts, cust] = await Promise.all([
                getEmployeesPrisma(business.id),
                getServicesPrisma(business.id),
                getServicesCategoriesPrisma(business.id),
                getAppointmentsByDatePrisma(business.id, currentDate),
                getClientsPrisma(business.id)
            ]);
            setEmployees(emp);
            setServices(srv);
            setServicesCategories(cats);
            setEvents(evts);
            setCustomers(cust);
        } catch (error) {
            console.error("Error cargando catálogos:", error);
        }
    };

    useEffect(() => {

        loadCatalogs();
    }, [business?.id, currentDate]);


    // El "Oído" que escucha el Pull To Refresh
    useEffect(() => {
        const handleGlobalRefresh = () => {
            console.log("¡Pull to refresh detectado en la vista!");
            loadCatalogs(); // Volvemos a consultar la base de datos
        };

        // Nos suscribimos al evento
        window.addEventListener('app:pullToRefresh', handleGlobalRefresh);

        // Limpiamos el evento cuando desmontamos el componente
        return () => window.removeEventListener('app:pullToRefresh', handleGlobalRefresh);
    }, [business?.id, currentDate]); // Pon aquí tus dependencias, como la fecha seleccionada

    // --- CÁLCULOS ---
    const total = useMemo(() => {
        return appointments.reduce((acc: any, curr: any) => acc + Number(curr.price), 0);
    }, [appointments]);

    // --- HANDLERS LÓGICOS ---

    const getUserInfo = () => {
        const role = session?.user?.role || "EMPLOYEE";
        const isAdmin = role === "ADMIN";
        const email = session?.user?.email;
        const currentEmployee = employees.find(e => e.user?.email === email);
        const canCreate = isAdmin || currentEmployee?.canCreateAppointments;
        
        return { role, isAdmin, currentEmployee, canCreate };
    };

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
        const { canCreate } = getUserInfo();
        if (!canCreate) {
            toast.error("No tienes autorización para agendar citas.");
            return;
        }

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
        const { canCreate } = getUserInfo();
        if (!canCreate) {
            toast.error("No tienes autorización para agendar citas.");
            return;
        }

        resetModalFields();
        setDate(currentDate);
        setTime(timeString);
        setSelectedEmployee(employee);

        openModal();
    };

    const handleEventClick = (event: any) => {
        setSelectedEvent(event); // Guardamos el evento original de FullCalendar

        const status = event.paymentStatus; 
        if (status === "PAID") {
            setShowSaleDetails(true);
        } else {
            setSelectedEmployee(event.employee);
            setCustomer({
                name: event.guestName,
                phone: event.guestPhone
            });

            if (event.start) {
                const yyyy = event.start.getFullYear();
                const mm = String(event.start.getMonth() + 1).padStart(2, '0');
                const dd = String(event.start.getDate()).padStart(2, '0');
                const hh = String(event.start.getHours()).padStart(2, '0');
                const min = String(event.start.getMinutes()).padStart(2, '0');
                setDate(`${yyyy}-${mm}-${dd}`);
                setTime(`${hh}:${min}`);
            }

            const appointmentServices = event.services || [];
            const fullServices = appointmentServices.map((apptService: any) => {
                if (apptService.service) {
                    return {
                        id: apptService.id,
                        name: apptService.service.name,
                        duration: apptService.service.duration,
                        price: apptService.price,
                        descriptionTicket: apptService.service.descriptionTicket,
                        serviceId: apptService.serviceId
                    };
                }

                return {
                    id: apptService.id,          
                    name: "Servicio Extra",
                    duration: 0,                 
                    price: apptService.price,    
                    descriptionTicket: "Servicio Extra",      
                    isCustom: true               
                };
            }).filter(Boolean);

            // Cargar pendientes
            getPendingRequests(event.id).then((pending) => {
                if (pending && pending.length > 0) {
                    // Marcamos "quitar" = opacidad reducida o algo, pero la UI principal no renderiza "remover", 
                    // a menos que queramos ocultar el que está en proceso de eliminación.
                    // Aquí agregaremos los 'ADD' pendientes como items visuales a inyectar al carrito
                    const addRequests = pending.filter((r: any) => r.action === "ADD" && r.service);
                    const ghosts = addRequests.map((r: any) => ({
                         id: `ghost-${r.id}`,
                         requestId: r.id,
                         serviceId: r.serviceId,
                         name: r.service.name,
                         duration: r.service.duration,
                         price: r.service.price,
                         descriptionTicket: r.service.descriptionTicket,
                         isPending: true
                    }));
                    
                    // También podemos pintar mark-for-delete en los que ya existen
                    const removeRequests = pending.filter((r: any) => r.action === "REMOVE");
                    
                    const mergedServices = fullServices.map((s: any) => {
                         const matchReq = removeRequests.find((r: any) => r.appointmentServiceId === s.id);
                         return {
                             ...s,
                             isPendingRemove: !!matchReq,
                             requestId: matchReq ? matchReq.id : null
                         };
                    }).concat(ghosts as any);

                    setAppointments(mergedServices);
                } else {
                    setAppointments(fullServices);
                }
            }).catch(() => setAppointments(fullServices));

            openModal();
        }

    };

    // Agregar servicio al carrito
    const addServiceToCart = async (service: any) => {
        const { canCreate, currentEmployee } = getUserInfo();
        
        // Si no tiene permisos de crear citas, al editar manda solicitud en vez de agregar directo.
        if (selectedEvent && !canCreate && currentEmployee) {
            try {
                const request = await requestAppointmentModification({
                    appointmentId: selectedEvent.id,
                    serviceId: service.id,
                    employeeRequesterId: currentEmployee.id,
                    action: "ADD"
                });
                // Reflejamos inmediatamente en UI que existe un alta pendiente.
                setAppointments(prev => [
                    ...prev,
                    {
                        id: `ghost-${request.id}`,
                        requestId: request.id,
                        serviceId: service.id,
                        name: service.name,
                        duration: service.duration,
                        price: service.price,
                        descriptionTicket: service.descriptionTicket,
                        isPending: true
                    }
                ]);
                toast.success("Solicitud enviada a Recepción.");
            } catch(e) {
                toast.error("Error al enviar solicitud.");
            }
            return;
        }

        const serviceCopia = Object.assign({}, service);
        serviceCopia.serviceId = serviceCopia.id;
        serviceCopia.id = null;

        setAppointments(prev => [...prev, serviceCopia]);

        // Efecto visual flash
        setFlashCategory(service.id);

        setTimeout(() => setFlashCategory(null), 150);
    };

    const removeServiceFromCart = async (indexToDelete: number) => {
         const deletingServiceItem = appointments[indexToDelete];
         const { canCreate, currentEmployee } = getUserInfo();

         // Si no puede crear citas y el servicio ya existe en BD, manda solicitud de eliminación.
         if (selectedEvent && !canCreate && deletingServiceItem.id && currentEmployee) {
              if (deletingServiceItem.isPendingRemove) {
                  toast.info("Esta eliminación ya está pendiente de autorización.");
                  return;
              }
              try {
                const request = await requestAppointmentModification({
                    appointmentId: selectedEvent.id,
                    serviceId: deletingServiceItem.serviceId,
                    appointmentServiceId: deletingServiceItem.id,
                    employeeRequesterId: currentEmployee.id,
                    action: "REMOVE"
                });
                // Marcamos visualmente el servicio como pendiente por eliminar.
                setAppointments(prev => prev.map((item, idx) => {
                    if (idx !== indexToDelete) return item;
                    return {
                        ...item,
                        isPendingRemove: true,
                        requestId: request.id
                    };
                }));
                toast.success("Solicitud de eliminación enviada.");
            } catch(e) {
                toast.error("Error al enviar solicitud.");
            }
            return; // No lo quitamos visualmente aún
         }

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
        if (!time || !date) {
            toast.warning("Ingresa fecha y hora");
            return
        }
        if (appointments.length === 0) {
            toast.warning("Ingresa al menos un servicio (o espera autorización)");
            // Si role es Employee e insertaron peticiones, quizás no deba guardar acá. 
            // Pero omitiremos bloqueos restrictivos.
            return;
        }
        if (selectedEmployee?.id == "" || selectedEmployee?.id == null) {
            toast.warning("Selecciona un empleado");
            return
        }

        const startDateTime = new Date(`${date}T${time}:00`);
        const endDateTime = new Date(`${date}T${timeEnd}:00`);

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
                const { canCreate } = getUserInfo();
                if (!canCreate) {
                    toast.error("No tienes permisos para agendar.");
                    return;
                }
                await createAppointment(payload);
            }
            // Siempre asegurar cliente
            if (customer.name && customer.phone) {
                await createClientPrisma(business?.id, customer.name, customer.phone, "", "", selectedEmployee?.id);
            }

            const newEvents = await getAppointmentsByDatePrisma(business?.id, currentDate);
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

        // Validaciones adicionales para paymentData
        if (!paymentData || typeof paymentData !== 'object') {
            toast.error("Datos de pago inválidos");
            return
        }

        if (!paymentData.total || paymentData.total <= 0) {
            toast.error("El total del pago debe ser mayor a 0");
            return
        }

        if (!paymentData.method || paymentData.method.trim() === '') {
            toast.error("El método de pago es requerido");
            return
        }

        try {
            // 2. Cálculos de tiempo con validación
            const startDateTime = new Date(`${date}T${time}:00`);
            if (isNaN(startDateTime.getTime())) {
                toast.error("Fecha u hora inválida");
                return
            }

            const totalMinutes = appointments.reduce((sum: number, ap: any) => sum + (ap.duration || 30), 0);
            const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60000);

            if (isNaN(endDateTime.getTime())) {
                toast.error("Error calculando hora de fin");
                return
            }

            // 3. Preparar Agrupación de Ítems con validación
            const groupedItems = appointments.reduce((acc: any, appt: any) => {
                if (!appt || (!appt.id && !appt.name)) {
                    console.warn("Servicio inválido encontrado, omitiendo:", appt);
                    return acc;
                }

                const key = appt.id || appt.name;
                if (!acc[key]) {
                    const price = Number(appt.price) || 0;
                    acc[key] = {
                        id: appt.id || null,
                        serviceId: appt.serviceId || null,
                        quantity: 0,
                        ticket_desc: appt.descriptionTicket || appt.name || "Servicio",
                        name: appt.name || "Servicio",
                        unitPrice: price,
                        totalPrice: 0
                    };
                }
                acc[key].quantity += 1;
                acc[key].totalPrice += Number(appt.price) || 0;
                return acc;
            }, {});

            const itemsList = Object.values(groupedItems);

            if (itemsList.length === 0) {
                toast.error("No hay servicios válidos para procesar");
                return
            }

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

            if (!saleResult.success) {
                throw new Error(saleResult?.error || "Error al procesar la venta en la base de datos");
            }

            // 6. PASO C: Asegurar Cliente en BD
            if (customer.name && customer.phone) {
                await createClientPrisma(business?.id, customer.name, customer.phone, "", "", selectedEmployee?.id);
            }

            //7. PASO D: Imprimir Ticket (función separada)
            await printSaleTicket(saleResult, paymentData, itemsList);

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

    // Función separada para imprimir ticket de venta
    const printSaleTicket = async (saleResult: any, paymentData: any, itemsList: any[]) => {
        try {
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

            await printTicket(ticketData).catch(e => console.log(e));
        } catch (error) {
            console.error("Error imprimiendo ticket:", error);
            toast.error("Error al imprimir ticket.");
        }
    };

    const handleUpdateDate = async (days: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + days);
        setCurrentDate(newDate.toISOString().split('T')[0]);


        const rtnAppoin = await getAppointmentsByDatePrisma(business?.id, newDate.toISOString().split('T')[0]);
        setEvents(rtnAppoin);
    };

    const handleResolveGhost = async (requestId: string, approve: boolean) => {
         try {
             await import("@/app/(admin)/(others-pages)/calendar/actions").then(m => m.resolveModificationRequest(requestId, approve));
             toast.success(approve ? "Cambio de cita aprobado." : "Solicitud denegada.");
             window.dispatchEvent(new Event('app:pullToRefresh'));
             if (selectedEvent?.id) {
                 handleEventClick(selectedEvent);
             }
         } catch(e) {
             toast.error("Error resolviendo la solicitud.");
         }
    };

    const handleReprintTicket = async () => {
        if (!selectedEvent) {
            toast.warning("No hay cita seleccionada para imprimir.");
            return;
        }

        try {
            const sale = await getSaleByAppointmentPrisma(business?.id, selectedEvent.id);
            const completedPayment = sale?.payments?.find((p: any) => p.status === "COMPLETED") || sale?.payments?.[0];

            const ticketItems = sale?.items?.length
                ? sale.items.map((item: any) => ({
                    quantity: item.quantity || 1,
                    ticket_desc: item.description || "Servicio",
                    price: Number(item.price || 0) * Number(item.quantity || 1)
                }))
                : (selectedEvent.services || []).map((svc: any) => ({
                    quantity: 1,
                    ticket_desc: svc.service?.descriptionTicket || svc.service?.name || "Servicio",
                    price: Number(svc.price || 0)
                }));

            const dateSource = sale?.createdAt || selectedEvent.start || new Date();
            const totalFallback = ticketItems.reduce((sum: number, item: any) => sum + Number(item.price || 0), 0);

            const ticketData = {
                businessName: business?.name || "Brillarte Bloom",
                folio: sale?.folio || selectedEvent.id?.slice(-6) || "REPRINT",
                total: Number(sale?.total ?? selectedEvent.totalAmount ?? totalFallback),
                paymentMethod: completedPayment?.method || "N/A",
                received: Number(completedPayment?.amountReceived ?? sale?.total ?? selectedEvent.totalAmount ?? totalFallback),
                change: Number(completedPayment?.changeReturned ?? 0),
                date: new Date(dateSource).toLocaleDateString('es-MX'),
                time: new Date(dateSource).toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                }),
                items: ticketItems
            };

            await printTicket(ticketData);
            toast.success("Ticket enviado a impresora.");
        } catch (error) {
            console.error("Error reimprimiendo ticket:", error);
            toast.error("No se pudo reimprimir el ticket.");
        }
    };

    return {
        getUserInfo,
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
        extraServicesModal, setExtraServicesModal,
        customers, setCustomer,
        handleResolveGhost,
        handleReprintTicket
    };
};
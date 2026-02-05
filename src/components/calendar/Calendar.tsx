"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { DateClickArg } from '@fullcalendar/interaction'; // <--- Importa esto
import esLocale from '@fullcalendar/core/locales/es'; // <--- 1. IMPORTAR ESTO
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import Select from "@/components/form/Select";

import { getEmployeesPrisma, getServicesPrisma, createAppointment, getAppointmentsPrisma, getServicesCategoriesPrisma } from "@/lib/prisma";
import { useBusiness } from "@/context/BusinessContext";
import { setServers } from "dns/promises";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

const Calendar: React.FC = () => {

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [selectedDate, setSelectedDate] = useState<{ start: Date; end: Date } | null>(null);

  const business = useBusiness();

  const [employees, setEmployees] = useState<any>([]);
  const [servicesCategories, setServicesCategories] = useState<any>([]);
  const [services, setServices] = useState<any>([]);
  const servicesRef = useRef(services); // <--- AGREGA ESTO


  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any>([]);

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [flashCategory, setFlashCategory] = useState<string | null>(null);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);

  useEffect(() => {
    const loadCatalogs = async () => {
      debugger
      //ARREGLAR ESTAS 2 FUNCIONES
      const res: any = await getEmployeesPrisma(business?.id);
      const res2: any = await getServicesPrisma(business?.id);
      const res3: any = await getServicesCategoriesPrisma(business?.id);

      setEmployees(res);
      setServices(res2);
      setServicesCategories(res3);
    };

    loadCatalogs();
  }, []);

  useEffect(() => {
    // Initialize with some events
    const loadEvents = async () => {
      debugger
      const resEvents: any = await getAppointmentsPrisma(business?.id);
      setEvents(resEvents);
    }
    loadEvents();
    // setEvents([
    //   {
    //     id: "1",
    //     title: "Event Conf.",
    //     start: new Date().toISOString().split("T")[0],
    //     extendedProps: { calendar: "Danger" },
    //   },
    //   {
    //     id: "2",
    //     title: "Meeting",
    //     start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    //     extendedProps: { calendar: "Success" },
    //   },
    //   {
    //     id: "3",
    //     title: "Workshop",
    //     start: new Date(Date.now() + 172800000).toISOString().split("T")[0],
    //     end: new Date(Date.now() + 259200000).toISOString().split("T")[0],
    //     extendedProps: { calendar: "Primary" },
    //   },
    // ]);
  }, []);

  const closeModalResetFields = () => {
    closeModal();
    setAppointments([]);
    setSelectedCategory(null);
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedClient(null);
  }

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    resetModalFields();
    setEventStartDate(selectInfo.startStr);
    setEventEndDate(selectInfo.endStr || selectInfo.startStr);
    openModal();
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    debugger
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);
    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();
  };


  // 2. Guardar en Base de Datos
  const handleSaveEvent = async () => {
    debugger
    alert(JSON.stringify(appointments));

    const startDateTime = new Date(`${date}T${time}:00`);
    const totalMinutes = appointments.reduce((sum: number, ap: any) => sum + ap.duration, 0);
    const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60000);


    const newAppointments = appointments.map((item: any) => ({
      serviceId: item.id,
      price: item.price,
    }));

    const newEvent = {
      businessId: business?.id,
      clientId: null,
      employeeId: selectedEmployee,
      title: "test",
      start: startDateTime,
      end: endDateTime,
      status: "PENDING",
      notes: "test",
      guestName: "test",
      guestPhone: "test",
      services: newAppointments
    };

    try {
      await createAppointment(newEvent);

    } catch (error) {
      console.error("Error al guardar", error);
    }
    closeModalResetFields();
    setEvents((prevEvents: any) => [...prevEvents, newEvent]);
    return
    // debugger
    // if (!selectedDate) return;
    // const title = 'test';
    // try {
    //   // Llamamos a la Server Action
    //   await createAppointment({
    //     title,
    //     start: selectedDate.start,
    //     end: selectedDate.end,
    //   });

    //   // Cerramos modal
    //   // setIsModalOpen(false);

    //   // Opcional: mostrar toast de éxito
    //   // alert("Evento guardado"); 

    // } catch (error) {
    //   console.error("Error al guardar", error);

  };


  // Función para cuando das clic en un hueco VACÍO (Crear)
  const handleDateClick = (arg: DateClickArg) => {
    debugger
    // arg.date contiene la fecha y hora donde hiciste clic
    // arg.dateStr es la fecha en string
    const start = arg.date;

    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, '0');
    const dd = String(start.getDate()).padStart(2, '0');

    const hh = String(start.getHours()).padStart(2, '0');
    const min = String(start.getMinutes()).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`); // para <input type="date">
    setTime(`${hh}:${min}`);        // para <input type="time">
    const end = new Date(arg.date.getTime() + 60 * 60 * 1000); // 1 hora por defecto


    //AUN no tenemos la fecha fin cada Appointment TIENE UN TIEMPO ESTIMADO HAY QUE SUMARLOS TOCOS Y CALCULAR LA FECHA FIN
    setSelectedDate({ start, end });
    // setIsModalOpen(true);
    openModal();

  };

  // Función para cuando das clic en una CITA EXISTENTE (Editar)
  const handleEventClick2 = (clickInfo: EventClickArg) => {
    debugger
    // arg.event contiene los datos de la cita real
    const event = clickInfo.event;
    setSelectedEmployee(event.extendedProps.employeeId);
    // 1. Extraemos los servicios guardados en la cita (Tu JSON)
    const appointmentServices = event.extendedProps.services || [];
    const currentCatalog = servicesRef.current;
    // 2. "Hidratamos" los datos cruzándolos con tu catálogo 'services'
    const fullServices = appointmentServices.map((apptService: any) => {
      // Buscamos el servicio original en tu catálogo usando el ID
      const catalogService = currentCatalog.find((s: any) => s.id === apptService.serviceId);

      // Si existe en el catálogo, lo usamos. 
      // Si no (por si se borró), usamos el respaldo que viene en 'service' dentro del JSON
      return catalogService || apptService.service;
    }).filter(Boolean); // Filtramos por si acaso quedó algún null/undefined

    // 3. Actualizamos el estado de las citas en el modal
    setAppointments(fullServices);
    setSelectedEvent(event as unknown as CalendarEvent);
    setEventTitle(event.title);

    const yyyy = event.start!.getFullYear();
    const mm = String(event.start!.getMonth() + 1).padStart(2, '0');
    const dd = String(event.start!.getDate()).padStart(2, '0');

    const hh = String(event.start!.getHours()).padStart(2, '0');
    const min = String(event.start!.getMinutes()).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`); // para <input type="date">
    setTime(`${hh}:${min}`);        // para <input type="time">

    setEventStartDate(event.start?.toISOString().split("T")[0] || "");
    setEventEndDate(event.end?.toISOString().split("T")[0] || "");
    setEventLevel(event.extendedProps.calendar);
    openModal();

  };

  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'CARD' | 'TRANSFER'
  const [amountReceived, setAmountReceived] = useState<string>(''); // String para facilitar el input
  const totalAmount = appointments.reduce((acc: number, curr: any) => acc + Number(curr.price), 0);

  // Calculamos el cambio dinámicamente
  const changeAmount = amountReceived ? Math.max(0, Number(amountReceived) - totalAmount) : 0;
  const handlePayEvent = () => {
    // Calculamos el total dinámicamente
    // Validar que haya servicios
    if (appointments.length === 0) {
      alert("Agrega al menos un servicio");
      return;
    }
    // Abrimos el modal de pago
    setShowPayModal(true);


    //actualizar appointment en base de datos
    //crear pago en base de datos
    //abrir modal de pago
    closeModalResetFields();
    //imprimir ticket
  }


  const handleFinalizePayment = async () => {

    // Aquí construyes el objeto completo
    const bookingData = {
      clientData: { /* ... datos del cliente ... */ },
      services: appointments,
      total: totalAmount,
      payment: {
        method: paymentMethod,
        received: paymentMethod === 'CASH' ? Number(amountReceived) : totalAmount,
        change: paymentMethod === 'CASH' ? changeAmount : 0
      },
      date: date, // Tus estados date y time
      time: time
    };

    console.log("Guardando en BD...", bookingData);

    // AQUI LLAMAS A TU SERVER ACTION (createAppointment)
    // await createAppointment(bookingData);

    // Cerrar todo y limpiar
    setShowPayModal(false);
    closeModalResetFields(); // Tu función que cierra el modal principal y limpia
  };





  const handleUpdateEvent = () => {
    //actualizar appointment en base de datos
    closeModalResetFields();
  }

  const addAppointment = (service: any) => {
    const newAppointment = service;
    setAppointments([...appointments, newAppointment]);
    setSelectedService(service);

    setFlashCategory(service.id);

    setTimeout(() => {
      setFlashCategory(null); // solo quita el flash
    }, 150);

    setTimeout(() => {
      setSelectedService(null); // quita selección después
    }, 300);
  };

  const handleAddOrUpdateEvent = () => {
    if (selectedEvent) {
      // Update existing event
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === selectedEvent.id
            ? {
              ...event,
              title: eventTitle,
              start: eventStartDate,
              end: eventEndDate,
              extendedProps: { calendar: eventLevel },
            }
            : event
        )
      );
    } else {
      // Add new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
    closeModal();
    resetModalFields();
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
  };

  const handleDelete = (indexToDelete: number) => {
    setAppointments((prevAppointments: any) =>
      prevAppointments.filter((_: any, i: number) => i !== indexToDelete)
    );
  };

  const onEmployeeChange = (e: any) => {
    debugger
    setSelectedEmployee(e);
  }

  return (
    <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "timeGridDay,timeGridWeek",
          }}
          height="auto"
          allDaySlot={false}
          longPressDelay={100}
          events={events}
          slotMinTime="09:00:00" // Empieza a las 9 AM
          slotMaxTime="18:00:00" // Termina a las 6 PM
          // selectable={true}
          // select={handleDateSelect}
          dateClick={handleDateClick}
          eventClick={handleEventClick2}
          eventContent={renderEventContent}
          locale={esLocale} // <--- 2. AÑADIR ESTO
          customButtons={{
            addEventButton: {
              text: "Nueva Cita",
              click: openModal,
            },
          }}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={closeModalResetFields}
        // TIP: Usamos h-[90vh] para que ocupe casi toda la pantalla pero deje margen
        // Quitamos el bg-amber-400 y pusimos blanco con bordes redondeados grandes
        className="w-full max-w-6xl h-[90vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >


        {/* --- 1. HEADER (Fijo, flex-none) --- */}
        <div className="flex-none px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div>
            <h5 className="text-xl font-bold text-gray-800 dark:text-white">
              {selectedEvent ? "Editar Cita" : "Nueva Cita"}
            </h5>
            <p className="text-sm text-gray-500">{selectedEvent ? "Detalles de la Cita" : "Completa los detalles para agendar"}</p>
          </div>
        </div>

        {/* BODY PRINCIPAL */}
        {/* flex-1 y min-h-0 obligatorios */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">

          {/* Columna Izquierda (Scroll simple) */}
          <div className="w-full lg:w-8/12 h-full overflow-y-auto custom-scrollbar p-6">
            {/* ... TU CONTENIDO DE INPUTS Y SERVICIOS IGUAL QUE ANTES ... */}

            {/* (Pego aquí un resumen para que no pierdas el contexto, pero mantén tu lógica de selects) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* ... Inputs de empleado ... */}
              {/* <div><label className="text-sm font-bold">Empleado</label><Select options={employees.map((e: any) => ({ value: e.id, label: `${e.user.name} ${e.user.lastName}` }))} placeholder="..." value={selectedEmployee?.id} onChange={(e) => setSelectedEmployee(e)} /></div> */}
              <div><label className="text-sm font-bold">Empleado</label><Select options={employees.map((e: any) => ({ value: e.id, label: `${e.user.name} ${e.user.lastName}` }))} placeholder="..." value={selectedEmployee || ""} onChange={(val) => {
                // Buscamos el empleado completo si es necesario o solo seteamos el ID
                const emp = employees.find((e: any) => String(e.id) === val);
                setSelectedEmployee(emp);
              }} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-sm font-bold">Teléfono</label><Select options={[]} placeholder="..." onChange={() => { }} /></div>
                <div><label className="text-sm font-bold">Nombre</label><Select options={[]} placeholder="..." onChange={() => { }} /></div>
              </div>
            </div>

            {/* Servicios */}
            <div className="sticky top-0 bg-white z-10 py-2">
              {/* ... Tus botones de categorías ... */}
              <div className="flex justify-center gap-2 pb-2">{servicesCategories.map((cat: any) => <button className={selectedCategory === cat.id ? "border px-3 py-2.5 rounded-full text-xs bg-black text-white " : "border px-3 py-2.5 rounded-full text-xs"} onClick={() => setSelectedCategory(cat.id)} key={cat.id}>{cat.name}</button>)}</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {services.filter((s: any) => s.categoryId === selectedCategory).map((ss: any) => (
                <button key={ss.id} onClick={() => addAppointment(ss)} className={`p-3 border rounded-lg text-left  transition-all duration-100 ease-in-out box-content 
                        ${selectedService?.id === ss.id ? 'bg-black text-white' : 'bg-white text-black'}
                  ${flashCategory === ss.id ? 'outline outline-black shadow-lg'
                    : 'outline-none shadow-none'}
                      `}>
                  <div className="font-bold text-sm">{ss.name}</div>
                  <div className="text-xs text-gray-500">${ss.price}</div>
                </button>
              ))}
            </div>
          </div>

          {/* === COLUMNA DERECHA (GRID SYSTEM) === */}
          {/* grid-rows-[auto_1fr_auto]: Header Auto, Lista Rellena, Footer Auto */}
          <div className="w-full lg:w-4/12 h-full bg-gray-50 dark:bg-gray-800/50 border-l border-gray-200 dark:border-gray-700 grid grid-rows-[auto_1fr_auto]">

            {/* A. HEADER (Fijo) */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold mb-2 text-gray-800 dark:text-white">Detalles</h3>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border p-1.5 rounded w-full text-sm" />
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="border p-1.5 rounded w-full text-sm" />
              </div>
            </div>

            {/* B. LISTA (Scrollable) */}
            {/* overflow-y-auto es vital aquí */}
            <div className="overflow-y-auto p-4 space-y-2">
              {appointments.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                  <span className="text-xl">🛒</span>
                  <span className="text-sm">Vacío</span>
                </div>
              )}
              {appointments.map((appointment: any, index: number) => (
                <div key={index} className="bg-white p-3 rounded shadow-sm border border-gray-200 flex justify-between items-center text-sm">
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold truncate">{appointment.name}</p>
                    <p className="text-xs text-gray-500">${appointment.price}</p>
                  </div>
                  <button onClick={() => handleDelete(index)} className="shrink-0 text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                </div>
              ))}
            </div>

            {/* C. FOOTER (Fijo) */}
            <div className="p-5 bg-white border-t border-gray-200 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end mb-4">
                <span className="text-gray-500 text-sm font-medium">Total</span>
                <span className="text-2xl font-bold text-gray-900">
                  ${appointments.reduce((acc: any, curr: any) => acc + Number(curr.price), 0)}
                </span>
              </div>
              <div className="flex gap-3">
                <button onClick={closeModalResetFields} className="flex-1 py-2.5 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button onClick={selectedEvent ? handleUpdateEvent : handleSaveEvent} className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm hover:bg-gray-800">{selectedEvent ? "Actualizar" : "Guardar"}</button>
                <button onClick={handlePayEvent} className="flex-1 py-2.5 bg-black text-white rounded-lg text-sm hover:bg-gray-800">Pagar</button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      {/* --- MODAL DE PAGO --- */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden p-0"
        showCloseButton={true}
      >
        <div className="flex flex-col h-full">
          {/* Header Pago */}
          <div className="bg-gray-50 p-6 border-b text-center">
            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wider mb-1">Total a Pagar</h3>
            <div className="text-5xl font-black text-gray-900 tracking-tight">
              ${totalAmount}
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* Selector de Método de Pago */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${paymentMethod === 'CASH'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span>💵</span> Efectivo
                </button>
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold flex items-center justify-center gap-2 transition-all
                            ${paymentMethod === 'CARD'
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                >
                  <span>💳</span> Tarjeta
                </button>
              </div>
            </div>

            {/* Lógica de Efectivo */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Cantidad Recibida</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      autoFocus
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 text-xl font-bold border-2 border-gray-300 rounded-xl focus:border-black focus:ring-0 outline-none transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Visualizador de Cambio */}
                <div className={`p-4 rounded-xl flex justify-between items-center transition-colors
                        ${changeAmount < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}
                    `}>
                  <span className="font-bold text-sm uppercase">Cambio / Vuelto</span>
                  <span className="text-2xl font-black">
                    ${changeAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Mensaje Tarjeta */}
            {paymentMethod === 'CARD' && (
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-center text-sm font-medium">
                Asegúrate de procesar el cobro en la terminal bancaria antes de confirmar.
              </div>
            )}

          </div>

          {/* Footer Botones */}
          <div className="p-6 border-t mt-auto bg-gray-50 flex gap-3">
            <button
              onClick={() => setShowPayModal(false)}
              className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors"
            >
              Atrás
            </button>
            <button
              onClick={handleFinalizePayment}
              disabled={paymentMethod === 'CASH' && Number(amountReceived) < totalAmount}
              className={`flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-all
                    ${(paymentMethod === 'CASH' && Number(amountReceived) < totalAmount)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-black hover:bg-gray-800 hover:scale-[1.02]'
                }
                `}
            >
              Confirmar Pago
            </button>
          </div>
        </div>
      </Modal>
    </div >
  );
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const employeeName = eventInfo.event.extendedProps.employee.user.name || "Sin asignar";
  const status = eventInfo.event.extendedProps.status;

  debugger
  const colorClass = employeeColors[employeeName];
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass}  rounded-sm`}
    // className={`event-fc-color flex fc-event-main p-1 rounded-sm`}
    >
      {/* <div className="flex items-center">{statusIcon(status)}</div> */}

      {/* hora */}
      {/* <div className="text-xs font-semibold">{eventInfo.timeText}</div> */}

      {/* nombre */}
      <div className="text-xs font-bold truncate px-2 py-1">{employeeName}</div>
    </div>
  );
};

export default Calendar;


const employeeColors: Record<string, string> = {
  "Ana": "bg-pink-200! text-pink-900",
  "Daniela": "bg-purple-200! text-purple-900",
  "Luis Alejandro": "bg-blue-200! text-blue-900",
  "María": "bg-yellow-200! text-yellow-900",
  "Sofía": "bg-green-200! text-green-900",
  "Valeria": "bg-orange-200! text-orange-900",
};
const statusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return "⏳";
    case "CONFIRMED":
      return "✅";
    case "CANCELLED":
      return "❌";
    case "COMPLETED":
      return "🏁";
    default:
      return "📌";
  }
};

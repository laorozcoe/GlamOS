"use client";
import React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from '@fullcalendar/core/locales/es';

// Imports locales
import { useCalendarLogic } from "./useCalendar";
import { BookingModal } from "./BookingModal";
import { PaymentModal } from "./PaymentModal";
import { renderEventContent } from "./CalendarUtils";
import { SaleDetailsModal } from "./SaleDetailsModal"; // <--- Importar

const Calendar: React.FC = () => {
  // Toda la lógica vive aquí
  const logic = useCalendarLogic();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
      <div className="custom-calendar p-2">
        <FullCalendar
          ref={logic.calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridDay"
          locale={esLocale}
          headerToolbar={{
            left: "prev,next addEventButton",
            center: "title",
            right: "timeGridDay,timeGridWeek",
          }}
          height="auto"
          allDaySlot={false}
          slotMinTime="09:00:00"
          slotMaxTime="20:00:00"

          // Data
          events={logic.events}

          // Actions
          dateClick={logic.handleDateClick}
          eventClick={logic.handleEventClick}
          eventContent={renderEventContent}

          customButtons={{
            addEventButton: {
              text: "Nueva Cita",
              click: logic.handleNewEventButton,
            },
          }}
        />
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
    </div>
  );
};

export default Calendar;
import { EventContentArg } from "@fullcalendar/core";

export const employeeColors: Record<string, string> = {
    "Ana": "bg-pink-200! text-pink-900",
    "Doris": "bg-purple-200! text-purple-900",
    "Luis Alejandro": "bg-blue-200! text-blue-900",
    "Rubi": "bg-yellow-200! text-yellow-900",
    "Sofía": "bg-green-200! text-green-900",
    "Valeria": "bg-orange-200! text-orange-900",
};

export const statusIcon = (status: string) => {
    switch (status) {
        case "PENDING": return "⏳";
        case "CONFIRMED": return "✅";
        case "CANCELLED": return "❌";
        case "COMPLETED": return "🏁";
        default: return "📌";
    }
};

export const renderEventContent = (eventInfo: EventContentArg) => {
    // Nota: Asegúrate de que tu objeto event tenga la estructura correcta
    const employeeName = eventInfo.event.extendedProps.employee?.user?.name || "Sin asignar";
    const paymentStatus = eventInfo.event.extendedProps.paymentStatus;
    // Fallback de color si no encuentra el nombre
    const colorClass = employeeColors[employeeName] || "bg-gray-100 text-gray-800";
    const isPaid = paymentStatus === "PAID";

    return (
        <div className={`event-fc-color flex fc-event-main ${colorClass} rounded-sm overflow-hidden`}>
            <div className="text-xs font-bold truncate p-2">
                <span>{employeeName}</span>
                {isPaid && <span className="text-xs ml-1" title="Pagado">💰</span>}
            </div>
        </div>
    );
};
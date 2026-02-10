"use client"
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
        width: '50%', left: '0%' // Ocupa la mitad izquierda
    },
    // Cita 3: Empieza 11:00 (Choca con la de arriba)
    {
        id: 'cita-3',
        colId: 2,
        title: 'Tinte Raíz',
        start: '11:00',
        duration: 90,
        color: 'bg-pink-100 border-pink-300 text-pink-700',
        width: '50%', left: '50%' // Ocupa la mitad derecha
    },
    {
        id: 'cita-4',
        colId: 2,
        title: 'Tinte Raíz',
        start: '11:00',
        duration: 90,
        color: 'bg-pink-100 border-pink-300 text-pink-700',
        width: '50%', left: '50%' // Ocupa la mitad derecha
    }
];

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

export default function CalendarGrid() {
    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

    return (
        <div className="flex flex-col h-screen max-h-[800px] bg-white border rounded-lg shadow-lg overflow-hidden">

            {/* HEADER */}
            <div className="flex-none bg-gray-50 border-b border-gray-200 z-20">
                <div className="grid" style={{ gridTemplateColumns: `60px repeat(${columns.length}, 1fr)` }}>
                    <div className="p-3 border-r border-gray-200"></div>
                    {columns.map((col) => (
                        <div key={col.id} className="p-3 text-center font-bold text-gray-700 border-r border-gray-200 last:border-r-0">
                            {col.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* BODY CON SCROLL */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="relative min-h-[640px]"> {/* Altura mínima para que no se corte */}

                    {/* 1. GRILLA DE FONDO (Horas y Medias Horas) */}
                    {hours.map((hour) => (
                        <div key={hour} className="flex border-b border-gray-100" style={{ height: `${HOUR_HEIGHT}px` }}>

                            {/* Columna de la Hora */}
                            <div className="w-[60px] flex-none border-r border-gray-100 bg-gray-50 text-xs text-gray-500 flex justify-center pt-2 relative">
                                <span className="-mt-3 bg-gray-50 px-1">{hour}:00</span>
                            </div>

                            {/* Columnas de Fondo */}
                            {columns.map((col) => (
                                <div key={col.id} className="flex-1 border-r border-gray-100 relative last:border-r-0">
                                    {/* LÍNEA DE MEDIA HORA (Dashed) */}
                                    <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-gray-200 pointer-events-none"></div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* 2. CAPA DE EVENTOS (Flotando encima) */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none pl-[60px] flex">
                        {/* Renderizamos una "columna contenedor" transparente por cada estación */}
                        {columns.map((col) => (
                            <div key={col.id} className="flex-1 relative border-r border-transparent last:border-r-0">

                                {/* Filtramos las citas que pertenecen a esta columna */}
                                {appointments
                                    .filter(app => app.colId === col.id)
                                    .map(app => {
                                        const pos = getPositionStyles(app.start, app.duration);

                                        return (
                                            <div
                                                key={app.id}
                                                className={`absolute p-2 rounded-md border-l-4 shadow-sm text-xs font-medium cursor-pointer hover:brightness-95 pointer-events-auto transition-all ${app.color}`}
                                                style={{
                                                    top: pos.top,
                                                    height: pos.height,
                                                    width: app.width,  // 50% si hay empalme
                                                    left: app.left,    // 0% o 50% según el empalme
                                                    zIndex: 10         // Para que quede encima de las líneas
                                                }}
                                                onClick={() => alert(`Click en ${app.title}`)}
                                            >
                                                <div className="font-bold">{app.title}</div>
                                                <div className="opacity-80">{app.start} - {app.duration}m</div>
                                            </div>
                                        );
                                    })}

                            </div>
                        ))}
                    </div>

                </div>
            </div>
        </div>
    );
};
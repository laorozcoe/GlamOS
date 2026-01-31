'use client'


import { useState } from 'react'

import {
    DndContext,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    PointerSensor,
} from '@dnd-kit/core'

export default function ScheduleBoard() {
    const sensors = useSensors(useSensor(PointerSensor))

    const [appointments, setAppointments] = useState([
        { id: '1', title: 'Luis - Corte', hour: '09:00' },
        { id: '2', title: 'Ana - Uñas', hour: '10:00' },
    ])

    const hours = ['09:00', '10:00', '11:00']

    function handleDragEnd(event) {
        const { active, over } = event
        if (!over) return

        setAppointments((prev) =>
            prev.map((a) =>
                a.id === active.id ? { ...a, hour: over.id } : a
            )
        )
    }

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
                {hours.map((hour) => (
                    <HourSlot
                        key={hour}
                        hour={hour}
                        appointments={appointments.filter((a) => a.hour === hour)}
                    />
                ))}
            </div>
        </DndContext>
    )
}


function HourSlot({ hour, appointments }) {
    const { setNodeRef, isOver } = useDroppable({
        id: hour,
    })

    return (
        <>
            {/* Columna hora */}
            <div
                style={{
                    padding: 10,
                    borderBottom: '1px solid #eee',
                    fontWeight: 'bold',
                }}
            >
                {hour}
            </div>

            {/* Columna citas */}
            <div
                ref={setNodeRef}
                style={{
                    minHeight: 60,
                    padding: 6,
                    borderBottom: '1px solid #eee',
                    background: isOver ? '#e0f2fe' : '#fafafa',
                    borderRadius: 6,
                }}
            >
                {appointments.map((app) => (
                    <Appointment key={app.id} appointment={app} />
                ))}
            </div>
        </>
    )
}

function Appointment({ appointment }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: appointment.id,
        })

    const style = {
        padding: '8px 10px',
        background: '#111827',
        color: 'white',
        borderRadius: 8,
        marginBottom: 6,
        fontSize: 14,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: transform
            ? `translate(${transform.x}px, ${transform.y}px)`
            : undefined,
        touchAction: 'none', // ✅ importante para tablet
    }

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
            {appointment.title}
        </div>
    )
}

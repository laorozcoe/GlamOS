
// // // // const Schedule = () => {
// // // //     return (
// // // //         <div>
// // // //             <h1>Schedule works!</h1>
// // // //         </div>
// // // //     );
// // // // };

// // // // export default Schedule;

// // // 'use client'


// // // import React, { useState } from 'react';
// // // import { DndContext } from '@dnd-kit/core';
// // // import { Draggable } from '@/components/test/Draggable';
// // // import { Droppable } from '@/components/test/Droppable';

// // // export default function Schedule() {
// // //     const [parent, setParent] = useState(null);
// // //     const draggable = (
// // //         <Draggable id="draggable">
// // //             Go ahead, drag me.
// // //         </Draggable>
// // //     );

// // //     return (
// // //         <DndContext onDragEnd={handleDragEnd}>
// // //             {!parent ? draggable : null}
// // //             <Droppable id="droppable">
// // //                 {parent === "droppable" ? draggable : 'Drop here'}
// // //             </Droppable>
// // //         </DndContext>
// // //     );

// // //     function handleDragEnd({ over }) {
// // //         setParent(over ? over.id : null);
// // //     }
// // // }


// // 'use client'

// // import { useState } from 'react'
// // import {
// //     DndContext,
// //     useDraggable,
// //     useDroppable,
// // } from '@dnd-kit/core'

// // const HOURS = [
// //     '09:00',
// //     '10:00',
// //     '11:00',
// //     '12:00',
// //     '13:00',
// //     '14:00',
// //     '15:00',
// // ]

// // export default function SchedulePage() {
// //     const [appointments, setAppointments] = useState([
// //         { id: '1', title: 'Luis - Corte', hour: '09:00' },
// //         { id: '2', title: 'Ana - Uñas', hour: '10:00' },
// //     ])

// //     function handleDragEnd(event) {
// //         const { active, over } = event
// //         if (!over) return

// //         const appointmentId = active.id
// //         const newHour = over.id

// //         setAppointments((prev) =>
// //             prev.map((a) =>
// //                 a.id === appointmentId ? { ...a, hour: newHour } : a
// //             )
// //         )
// //     }

// //     return (
// //         <div style={{ padding: 20 }}>
// //             <h2>Agenda</h2>

// //             <DndContext onDragEnd={handleDragEnd}>
// //                 <div
// //                     style={{
// //                         display: 'grid',
// //                         gridTemplateColumns: '120px 1fr',
// //                         gap: 8,
// //                     }}
// //                 >
// //                     {HOURS.map((hour) => (
// //                         <HourSlot
// //                             key={hour}
// //                             hour={hour}
// //                             appointments={appointments.filter(
// //                                 (a) => a.hour === hour
// //                             )}
// //                         />
// //                     ))}
// //                 </div>
// //             </DndContext>
// //         </div>
// //     )
// // }

// // /* SLOT DE HORA */
// // function HourSlot({ hour, appointments }) {
// //     const { setNodeRef, isOver } = useDroppable({
// //         id: hour,
// //     })

// //     return (
// //         <>
// //             <div style={{ fontWeight: 'bold' }}>{hour}</div>

// //             <div
// //                 ref={setNodeRef}
// //                 style={{
// //                     minHeight: 60,
// //                     border: '1px solid #ccc',
// //                     padding: 6,
// //                     background: isOver ? '#e0f2fe' : '#fff',
// //                     borderRadius: 6,
// //                 }}
// //             >
// //                 {appointments.map((a) => (
// //                     <AppointmentCard key={a.id} appointment={a} />
// //                 ))}
// //             </div>
// //         </>
// //     )
// // }

// // /* CITA */
// // function AppointmentCard({ appointment }) {
// //     const { attributes, listeners, setNodeRef, transform } =
// //         useDraggable({
// //             id: appointment.id,
// //         })

// //     const style = {
// //         transform: transform
// //             ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
// //             : undefined,
// //         padding: '6px 10px',
// //         background: '#111827',
// //         color: 'white',
// //         borderRadius: 6,
// //         marginBottom: 6,
// //         cursor: 'grab',
// //     }

// //     return (
// //         <div
// //             ref={setNodeRef}
// //             style={style}
// //             {...listeners}
// //             {...attributes}
// //         >
// //             {appointment.title}
// //         </div>
// //     )
// // }



// 'use client'

// import { useState } from 'react'
// import {
//     DndContext,
//     useDraggable,
//     useDroppable,
//     useSensor,
//     useSensors,
//     MouseSensor,
//     TouchSensor,
//     PointerSensor,
// } from '@dnd-kit/core'

// const HOURS = [
//     '09:00',
//     '10:00',
//     '11:00',
//     '12:00',
//     '13:00',
//     '14:00',
//     '15:00',
// ]

// export default function SchedulePage() {
//     const [appointments, setAppointments] = useState([
//         { id: '1', title: 'Luis - Corte', hour: '09:00' },
//         { id: '2', title: 'Ana - Uñas', hour: '10:00' },
//     ])

//     // ✅ sensores para mouse + touch + pointer
//     const sensors = useSensors(
//         useSensor(MouseSensor),
//         useSensor(TouchSensor, {
//             activationConstraint: {
//                 delay: 150, // tiempo para activar drag en touch
//                 tolerance: 5,
//             },
//         }),
//         useSensor(PointerSensor)
//     )

//     function handleDragEnd(event) {
//         const { active, over } = event
//         if (!over) return

//         const appointmentId = active.id
//         const newHour = over.id

//         setAppointments((prev) =>
//             prev.map((a) =>
//                 a.id === appointmentId ? { ...a, hour: newHour } : a
//             )
//         )
//     }

//     return (
//         <div style={{ padding: 20 }}>
//             <h2>Agenda</h2>

//             <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
//                 <div
//                     style={{
//                         display: 'grid',
//                         gridTemplateColumns: '120px 1fr',
//                         gap: 8,
//                     }}
//                 >
//                     {HOURS.map((hour) => (
//                         <HourSlot
//                             key={hour}
//                             hour={hour}
//                             appointments={appointments.filter(
//                                 (a) => a.hour === hour
//                             )}
//                         />
//                     ))}
//                 </div>
//             </DndContext>
//         </div>
//     )
// }


import ClientOnly from '@/components/test/ClientOnly'
import ScheduleBoard from '@/components/test/ScheduleBoard'

export default function SchedulePage() {
    return (
        <ClientOnly>
            <ScheduleBoard />
        </ClientOnly>
    )
}

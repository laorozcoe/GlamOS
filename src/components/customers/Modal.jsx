import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, FileText } from 'lucide-react';
import Button from '@/components/ui/button/Button'; // Tu componente de botón
import Select from '@/components/form/Select';
import { Modal } from '@/components/ui/modal';

export default function CustomerModal({ isOpen, onClose, onSave, customerToEdit, employees, handleDeleteCustomer }) {

    // Estado inicial del formulario
    const initialFormState = {
        name: '',
        email: '',
        phone: '',
        notes: ''
    };

    const [formData, setFormData] = useState(initialFormState);

    // EFECTO: Cada vez que se abre el modal o cambia el cliente a editar
    useEffect(() => {
        if (isOpen) {
            if (customerToEdit) {
                // Modo Edición: Llenamos con datos existentes
                setFormData({
                    name: customerToEdit.name || '',
                    email: customerToEdit.email || '',
                    phone: customerToEdit.phone || '',
                    notes: customerToEdit.notes || '',
                    employeeId: customerToEdit.employeeId || ''
                });
            } else {
                // Modo Crear: Limpiamos el formulario
                setFormData(initialFormState);
            }
        }
    }, [isOpen, customerToEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Devolvemos los datos al padre. Si editamos, mantenemos el ID.
        onSave({
            ...formData,
            id: customerToEdit?.id // Si es nuevo, esto será undefined (el backend lo crea)
        });
    };

    return (
        <Modal
            isOpen={isOpen} onClose={onClose}
            // onClose={() => { setIsServiceModalOpen(false); setEditingService(null) }}
            title={customerToEdit?.id ? "Editar Cliente" : "Nuevo Cliente"}
            className="flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 max-w-md"
        >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full overflow-hidden">
                <div className="flex justify-between items-center px-4 pb-4 sm:pb-8 border-b border-gray-200 dark:border-gray-800">
                    {/* <h3 className="">{editingService?.id ? "Editar Servicio" : "Nuevo Servicio"}</h3> */}
                    <h3 className="font-semibold text-lg sm:text-xl">
                        {customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h3>
                </div>
                {/* --- BODY (FORMULARIO) --- */}
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Nombre */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User size={14} /> Nombre Completo *asd
                        </label>
                        <input
                            required
                            type="text"
                            name="name"
                            placeholder="Ej. María Pérez"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Teléfono */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Phone size={14} /> Teléfono
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                placeholder="Ej. 614 123 4567"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <Mail size={14} /> Correo Electrónico
                            </label>
                            <input
                                type="email"
                                name="email"
                                placeholder="cliente@email.com"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    {/* Empleado */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <User size={14} /> Empleado Favorito
                        </label>
                        <Select
                            name="employeeId"
                            placeholder="Selecciona un empleado"
                            value={formData.employeeId}
                            onChange={(val) => {
                                setFormData({
                                    ...formData,
                                    employeeId: val
                                })
                            }}
                            options={employees.map(employee => ({
                                value: employee.id,
                                label: employee.user.name + ' ' + employee.user.lastName
                            }))}
                        />

                    </div>
                    {/* Notas */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <FileText size={14} /> Notas Internas
                        </label>
                        <textarea
                            name="notes"
                            rows={3}
                            placeholder="Preferencias, alergias, notas importantes..."
                            value={formData.notes}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                        />
                    </div>

                    {/* --- FOOTER (BOTONES) --- */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                        <Button
                            type="button"
                            onClick={handleDeleteCustomer}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            Eliminar
                        </Button>
                        <Button type="submit" className="flex items-center gap-2">
                            {customerToEdit ? 'Guardar Cambios' : 'Crear Cliente'}
                        </Button>
                    </div>

                </form>
            </div>
        </Modal>


        // // Overlay (Fondo oscuro)
        // <Modal isOpen={isOpen} onClose={onClose} className="">

        //     {/* Contenedor del Modal */}
        //     <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200">

        //         {/* --- HEADER --- */}
        //         <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
        //             <h3 className="text-lg font-bold text-gray-800 dark:text-white">
        //                 {customerToEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
        //             </h3>
        //             <button
        //                 onClick={onClose}
        //                 className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500"
        //             >
        //                 <X size={20} />
        //             </button>
        //         </div>

        //         
        //     </div>
        // </Modal>
    );
}
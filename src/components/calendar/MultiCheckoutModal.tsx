import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import InputField from "../form/input/InputField";

interface MultiCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: any[]; // The daily appointments
    onProceedToPayment: (selectedAppointments: any[], totalSum: number) => void;
    canViewClientData?: boolean;
}

export const MultiCheckoutModal: React.FC<MultiCheckoutModalProps> = ({
    isOpen, onClose, events, onProceedToPayment, canViewClientData = true
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    // Filter unpaid events for the current day
    const unpaidEvents = events.filter((event) => event.paymentStatus === "UNPAID");

    const filteredEvents = unpaidEvents.filter((event) => {
        const term = searchTerm.toLowerCase();
        const serviceName = (event.title || "").toLowerCase();
        if (!canViewClientData) return serviceName.includes(term);
        const clientName = (event.guestName || "Cliente sin nombre").toLowerCase();
        return clientName.includes(term) || serviceName.includes(term);
    });

    useEffect(() => {
        if (!isOpen) { // Reset when modal closes
            setSelectedIds([]);
            setSearchTerm("");
        }
    }, [isOpen]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedIds.length === filteredEvents.length && filteredEvents.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredEvents.map(e => e.id));
        }
    };

    const selectedEvents = unpaidEvents.filter(e => selectedIds.includes(e.id));
    
    // Calculate total checking services if totalAmount is missing or 0
    const totalSum = selectedEvents.reduce((sum, event) => {
        if (event.totalAmount > 0) return sum + Number(event.totalAmount);
        // Fallback: sum up services
        if (event.services && event.services.length > 0) {
            const svcTotal = event.services.reduce((sSum: number, svc: any) => sSum + Number(svc.price || 0), 0);
            return sum + svcTotal;
        }
        return sum;
    }, 0);

    const handleProceed = () => {
        if (selectedIds.length > 0) {
            onProceedToPayment(selectedEvents, totalSum);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            className="w-[95svw] max-w-2xl rounded-2xl shadow-2xl overflow-hidden p-0 bg-white dark:bg-gray-900"
            showCloseButton={true}
        >
            <div className="flex flex-col h-[85svh] md:h-[70svh]">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">Pago de Múltiples Citas</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Selecciona las citas que deseas cobrar juntas.</p>
                    </div>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                    <InputField 
                        type="text" 
                        placeholder="Buscar por cliente o servicio..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-900/50">
                    {unpaidEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-gray-500">
                            <span className="text-4xl mb-4">👍</span>
                            <p className="font-bold">No hay citas pendientes de cobro</p>
                            <p className="text-sm">Todas las citas del día han sido cobradas.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                           <div className="flex justify-between items-center mb-4 px-2">
                               <Label className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                   Mostrando {filteredEvents.length} cita(s)
                               </Label>
                               {filteredEvents.length > 0 && (
                                   <button 
                                       onClick={handleSelectAll} 
                                       className="text-sm font-bold text-brand-500 hover:text-brand-600 transition-colors"
                                   >
                                       {selectedIds.length === filteredEvents.length ? "Deseleccionar Todas" : "Seleccionar Todas"}
                                   </button>
                               )}
                           </div>
                           
                            {filteredEvents.map(event => {
                                const isSelected = selectedIds.includes(event.id);
                                
                                // Helper to get the correct total for the UI
                                let eventTotal = Number(event.totalAmount);
                                if (!eventTotal && event.services) {
                                    eventTotal = event.services.reduce((sSum: number, svc: any) => sSum + Number(svc.price || 0), 0);
                                }

                                const dateStr = event.start ? new Date(event.start).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

                                return (
                                    <div 
                                        key={event.id}
                                        onClick={() => toggleSelection(event.id)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-4
                                            ${isSelected ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-brand-300'}`}
                                    >
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors
                                            ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300 dark:border-gray-600 bg-transparent'}`}
                                        >
                                            {isSelected && <span className="text-xs font-black">✓</span>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {canViewClientData ? (event.guestName || "Cliente sin nombre") : "Cliente"}
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                    {dateStr}
                                                </span>
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                                                {event.title || "Servicio"} • {event.employee?.user?.name || "Sin Especialista"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-gray-900 dark:text-white text-lg">${eventTotal.toLocaleString()}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-between items-center mt-auto">
                    <div>
                        <Label className="text-gray-500 font-medium text-xs uppercase block">Total Seleccionado</Label>
                        <Label className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">${totalSum.toLocaleString()}</Label>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={onClose} variant="outline" className="px-6 py-3 font-bold rounded-xl text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleProceed} 
                            disabled={selectedIds.length === 0}
                            className={`px-6 py-3 font-bold text-white rounded-xl shadow-lg transition-all
                                ${selectedIds.length === 0 ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-black hover:bg-gray-800 hover:scale-[1.02]'}`}
                        >
                            Ir a Pagar ({selectedIds.length})
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

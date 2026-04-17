"use client";
import React, { useEffect, useState } from "react";
import { getPendingRequests, resolveModificationRequest } from "@/app/(admin)/(others-pages)/calendar/actions";
import Button from "@/components/ui/button/Button";
import { useSession } from "@/lib/auth-client";
import { CheckIcon, XIcon, Clock } from "lucide-react";
import { toast } from "react-toastify";

export default function ApprovalWidget() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState<any[]>([]);

    const role = session?.user?.role || "EMPLOYEE";
    const canApprove = role === "ADMIN" || role === "RECEPTION";

    const loadRequests = async () => {
        if (!canApprove) return;
        try {
            const data = await getPendingRequests();
            setRequests(data);
        } catch (e) { }
    };

    useEffect(() => {
        loadRequests();
        const inter = setInterval(loadRequests, 30000); // Polling every 30s
        return () => clearInterval(inter);
    }, [canApprove]);

    if (!canApprove || requests.length === 0) return null;

    const handleResolve = async (requestId: string, approve: boolean) => {
        try {
            await resolveModificationRequest(requestId, approve);
            toast.success(approve ? "Cambio de cita aprobado." : "Solicitud denegada.");
            await loadRequests();
            // Disparamos un evento para que CalendarClient también se entere y recargue
            window.dispatchEvent(new Event('app:pullToRefresh'));
        } catch (e) {
            toast.error("Error resolviendo la solicitud.");
        }
    };

    return (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl p-4 dark:bg-orange-900/20 dark:border-orange-800">
            <h3 className="flex items-center text-orange-800 font-semibold mb-3 dark:text-orange-400">
                <Clock className="w-5 h-5 mr-2" />
                Tienes {requests.length} solicitud{requests.length > 1 ? "es" : ""} de cambio de agenda
            </h3>
            <div className="space-y-2">
                {requests.map(req => (
                    <div key={req.id} className="flex flex-wrap items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-lg border border-orange-100 dark:border-gray-700">
                        <div className="text-sm">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">{req.employee?.user?.name} {req.employee?.user?.lastName}</span>
                            <span className="text-gray-500 mx-1">quiere</span>
                            <span className={`font-bold ${req.action === "ADD" ? "text-success-600" : "text-error-600"}`}>
                                {req.action === "ADD" ? "AGREGAR" : "QUITAR"}
                            </span>
                            <span className="text-gray-600 dark:text-gray-400 ml-1">
                                {req.service ? req.service.name : "un servicio"}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 sm:mt-0 font-medium">
                                Cita: {req.appointment?.guestName} - {new Date(req.appointment?.start).toLocaleDateString()} a las {new Date(req.appointment?.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                            <Button
                                variant="outline"
                                className="text-error-600 hover:bg-error-50 px-3 py-1.5 h-auto text-xs"
                                onClick={() => handleResolve(req.id, false)}
                            >
                                <XIcon className="w-4 h-4 mr-1" /> Rechazar
                            </Button>
                            <Button
                                className="bg-success-600 hover:bg-success-700 px-3 py-1.5 h-auto text-xs"
                                onClick={() => handleResolve(req.id, true)}
                            >
                                <CheckIcon className="w-4 h-4 mr-1" /> Aceptar
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

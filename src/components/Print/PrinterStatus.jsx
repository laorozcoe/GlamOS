// components/calendar/PrinterStatus.jsx
import React from 'react';

export const PrinterStatus = ({ status, onConnect }) => {
    const statusConfig = {
        online: { color: 'bg-green-500', text: 'Impresora Lista', pulse: false },
        connecting: { color: 'bg-yellow-500', text: 'Conectando...', pulse: true },
        busy: { color: 'bg-orange-500', text: 'Ocupada por otra pestaña', pulse: false },
        offline: { color: 'bg-red-500', text: 'Impresora Desconectada', pulse: false },
    };

    const current = statusConfig[status] || statusConfig.offline;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 shadow-sm transition-all">
            <div className="relative flex h-3 w-3">
                {current.pulse && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${current.color}`}></span>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                {current.text}
            </span>

            {status === 'offline' && (
                <button
                    onClick={onConnect}
                    className="ml-1 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700 transition-colors"
                >
                    CONECTAR
                </button>
            )}

            {status === 'busy' && (
                <button
                    onClick={onConnect}
                    className="ml-1 text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded hover:bg-orange-700 transition-colors"
                    title="Intentar tomar el control de la impresora"
                >
                    FORZAR
                </button>
            )}
        </div>
    );
};
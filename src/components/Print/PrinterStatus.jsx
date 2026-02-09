// components/calendar/PrinterStatus.jsx
import React from 'react';
import { PrinterCheck, PrinterX, PanelTopOpen } from 'lucide-react';


export const PrinterStatus = ({ status, onConnect, openDrawer }) => {
    const statusConfig = {
        online: { color: 'text-green-500', icon: PrinterCheck },
        connecting: { color: 'text-yellow-500', icon: PrinterX, pulse: true },
        busy: { color: 'text-orange-500', icon: PrinterX },
        offline: { color: 'text-red-500', icon: PrinterX },
    };
    const config = statusConfig[status] || statusConfig.offline;
    const Icon = config.icon; // Referencia al componente

    // este center no me convense revisaro TODO
    return (
        <div className="flex items-center gap-8 justify-center">
            {/* Círculo de estado */}
            <div className="relative flex h-3 w-3">
                {config.pulse && (
                    <span className="animate-ping absolute h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                )}
            </div>

            <button
                onClick={onConnect}

            >
                <Icon size={24} className={config.color} />
            </button>

            <button
                onClick={openDrawer}

            >
                <PanelTopOpen size={24} className={config.color} />
            </button>
            {/* El Icono con tamaño definido */}


            {/* ... botones */}
        </div>
    );
};
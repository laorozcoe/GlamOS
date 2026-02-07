'use client'
import { useState, useEffect } from 'react';
import EscPosEncoder from 'esc-pos-encoder';

export const usePrinter = () => {
    const [device, setDevice] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printerError, setPrinterError] = useState('');
    const [status, setStatus] = useState('offline'); // 'offline' | 'connecting' | 'online' | 'busy'

    // Función de conexión robusta
    const connectToDevice = async (usbDevice) => {
        debugger
        setStatus('connecting');
        try {
            await usbDevice.open();
            await usbDevice.selectConfiguration(1);
            await usbDevice.claimInterface(0);
            setDevice(usbDevice);
            console.log("✅ Conectado exitosamente a:", usbDevice.productName);
            setStatus('online'); // El foquito se pondrá verde
            return true;
        } catch (err) {
            // Si ya está abierto, lo consideramos conectado
            if (err.name === 'SecurityError') {
                setPrinterError("Acceso denegado: Cambia el driver a WinUSB con Zadig.");
            } else if (err.message.includes('An operation that changes the device state')) {
                setStatus('busy'); // Alguien más la tiene (Amarillo/Rojo)
            } else {
                setStatus('offline');
                console.warn(`No se pudo conectar a ${usbDevice.productName}:`, err.message);
                return false;
            }
        }
    };

    // 1. Auto-conexión: Busca en TODOS los dispositivos permitidos
    const autoConnect = async () => {
        debugger
        if (!navigator.usb) return;
        const devices = await navigator.usb.getDevices();

        for (const usbDevice of devices) {
            const success = await connectToDevice(usbDevice);
            if (success) break; // Si encontramos la impresora, paramos el for
        }
    };

    useEffect(() => {
        autoConnect();
        // 2. FUNCIÓN DE LIMPIEZA (Cleanup)
        const cleanup = async () => {
            if (device && device.opened) {
                try {
                    await device.releaseInterface(0);
                    await device.close();
                    console.log("Impresora liberada correctamente");
                } catch (e) {
                    console.error("Error al liberar:", e);
                }
            }
        };

        // Escuchar cierre de pestaña o F5
        window.addEventListener('beforeunload', cleanup);

        // Cleanup de React cuando el componente desaparece
        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };

    }, [device]);

    const requestPrinter = async () => {
        debugger
        try {
            const selectedDevice = await navigator.usb.requestDevice({ filters: [] });
            return await connectToDevice(selectedDevice);
        } catch (err) {
            console.log("Selección cancelada");
        }
    };

    const processImageOnCanvas = (url) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const targetWidth = 304;
                const aspectRatio = img.height / img.width;
                canvas.width = targetWidth;
                canvas.height = Math.floor(targetWidth * aspectRatio);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas);
            };
            img.onerror = () => resolve(null);
        });
    };

    const generateLine = (qty, desc, price) => {
        const qtyStr = `${qty}x`;
        const priceStr = `$${Number(price).toFixed(2)}`;
        const cleanDesc = (desc || "Item").substring(0, 15).trim();
        const leftPart = `${qtyStr} ${cleanDesc}`;
        const spaceCount = 32 - leftPart.length - priceStr.length;
        const spaces = ' '.repeat(Math.max(0, spaceCount));
        return `${leftPart}${spaces}${priceStr}\n`;
    };

    const printTicket = async (ticketData) => {
        debugger
        setIsPrinting(true);
        setPrinterError('');

        try {
            // Asegurar conexión antes de imprimir
            let currentDevice = device;
            if (!currentDevice || !currentDevice.opened) {
                const devices = await navigator.usb.getDevices();
                for (const d of devices) {
                    const success = await connectToDevice(d);
                    if (success) {
                        currentDevice = d;
                        break;
                    }
                }
            }

            if (!currentDevice) throw new Error("Impresora no encontrada. Por favor, conéctala manualmente.");

            const imgCanvas = await processImageOnCanvas('/brillarte-bloom/logo_ticket-bw.png');
            const encoder = new EscPosEncoder({ width: 32, imageMode: 'raster', codepageMapping: 'xprinter' });

            let printJob = encoder.initialize().codepage('cp850').raw([0x1B, 0x33, 20]);

            if (imgCanvas) {
                printJob = printJob.align('center').image(imgCanvas, imgCanvas.width, imgCanvas.height, 'atkinson');
            }

            // --- DISEÑO DEL TICKET ---
            printJob = printJob
                .newline().bold(true).text(`${ticketData.businessName}\n`).bold(false)
                .align('left').text(`Fecha: ${ticketData.date}\n`)
                .text('--------------------------------\n');

            ticketData.items.forEach(item => {
                printJob = printJob.text(generateLine(item.quantity, item.ticket_desc || item.name, item.price));
            });

            // --- TOTALES Y PAGO ---
            printJob = printJob
                .text('--------------------------------\n')
                .align('right')
                .bold(true)
                .text(`TOTAL: $${Number(ticketData.total).toFixed(2)}\n`)
                .bold(false);

            const metodoTxt = ticketData.paymentMethod === 'CASH' ? 'EFECTIVO' : 'TARJETA';
            printJob = printJob.text(`PAGO: ${metodoTxt}\n`);

            if (ticketData.paymentMethod === 'CASH') {
                printJob = printJob
                    .text(`RECIBIDO: $${Number(ticketData.received).toFixed(2)}\n`)
                    .text(`CAMBIO: $${Number(ticketData.change).toFixed(2)}\n`);
            }

            printJob = printJob
                .newline().align('center')
                .text('¡Ten un lindo día!\n')
                .newline().newline().newline()
                .cut().pulse();

            const result = printJob.encode();

            // Usar el endpoint 'out' de forma dinámica (como en tu test)
            const interfaceData = currentDevice.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            await currentDevice.transferOut(endpoint.endpointNumber, result);
            return true;

        } catch (err) {
            console.error("Error en printTicket:", err);
            setPrinterError(err.message);
            return false;
        } finally {
            setIsPrinting(false);
        }
    };

    return { device, isPrinting, printerError, status, connect: requestPrinter, printTicket };
};
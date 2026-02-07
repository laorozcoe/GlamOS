'use client'
import { useState, useEffect } from 'react';
import EscPosEncoder from 'esc-pos-encoder';

export const usePrinter = () => {
    const [device, setDevice] = useState(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printerError, setPrinterError] = useState('');

    useEffect(() => {
        const init = async () => {
            if (navigator.usb) {
                const devices = await navigator.usb.getDevices();
                if (devices.length > 0) connectToDevice(devices[0]);
            }
        };
        init();
    }, []);

    const connectToDevice = async (usbDevice) => {
        try {
            await usbDevice.open();
            await usbDevice.selectConfiguration(1);
            await usbDevice.claimInterface(0);
            setDevice(usbDevice);
            setPrinterError('');
            return true;
        } catch (err) {
            console.error("Error conexión:", err);
            if (err.message.includes('open')) {
                setDevice(usbDevice);
                return true;
            }
            setPrinterError(err.message);
            return false;
        }
    };

    const requestPrinter = async () => {
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
        setIsPrinting(true);
        setPrinterError('');

        try {
            let currentDevice = device;
            // Verificar conexión
            if (!currentDevice || !currentDevice.opened) {
                const devices = await navigator.usb.getDevices();
                if (devices.length > 0) {
                    await connectToDevice(devices[0]);
                    currentDevice = devices[0];
                } else {
                    throw new Error("Impresora no encontrada. Conéctala manualmente.");
                }
            }

            const imgCanvas = await processImageOnCanvas('/brillarte-bloom/logo_ticket-bw.png');
            const encoder = new EscPosEncoder({ width: 32, imageMode: 'raster', codepageMapping: 'xprinter' });

            let printJob = encoder.initialize().codepage('cp850').raw([0x1B, 0x33, 20]);

            if (imgCanvas) {
                printJob = printJob.align('center').image(imgCanvas, imgCanvas.width, imgCanvas.height, 'atkinson');
            }

            printJob = printJob
                .newline().bold(true).text(`${ticketData.businessName}\n`).bold(false)
                .align('left').text(`Fecha: ${ticketData.date}\n`)
                .text('--------------------------------\n');

            ticketData.items.forEach(item => {
                printJob = printJob.text(generateLine(item.quantity, item.ticket_desc || item.name, item.price));
            });

            printJob = printJob
                .text('--------------------------------\n')
                .align('right')
                .bold(true)
                .text(`TOTAL: $${Number(ticketData.total).toFixed(2)}\n`)
                .bold(false);

            // 2. NUEVA SECCIÓN: Detalle de Pago
            const metodoTexto = ticketData.paymentMethod === 'CASH' ? 'EFECTIVO' : 'TARJETA';
            printJob = printJob.text(`PAGO: ${metodoTexto}\n`);

            if (ticketData.paymentMethod === 'CASH') {
                // Formateamos para que queden alineados a la derecha (opcional)
                // "RECIBIDO: $500.00"
                printJob = printJob
                    .text(`RECIBIDO: $${Number(ticketData.received).toFixed(2)}\n`)
                    .text(`CAMBIO: $${Number(ticketData.change).toFixed(2)}\n`);
            }

            const result = printJob; // Ya es el Uint8Array que devuelve .encode()

            // --- LÓGICA DE TU TEST (RESTAURADA) ---
            const interfaceData = currentDevice.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            if (!endpoint) throw new Error("No se encontró canal de salida (OUT)");

            await currentDevice.transferOut(endpoint.endpointNumber, result);
            return true;

        } catch (err) {
            console.error(err);
            setPrinterError(err.message);
            return false;
        } finally {
            setIsPrinting(false);
        }
    };

    return { device, isPrinting, printerError, connect: requestPrinter, printTicket };
};
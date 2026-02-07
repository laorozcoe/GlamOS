'use client';
import { useState, useEffect } from 'react';
import EscPosEncoder from 'esc-pos-encoder';

export default function WebUsbPrinter({ ticketData }) {
    const [device, setDevice] = useState(null);
    const [status, setStatus] = useState('Desconectado');
    const [error, setError] = useState('');
    const [isPrinting, setIsPrinting] = useState(false);

    // Datos por defecto si no llegan props (para que no truene)
    const defaultData = {
        businessName: "Brillarte Bloom",
        date: new Date().toLocaleDateString('es-MX'),
        items: [
            { quantity: 1, ticket_desc: "Uñas Acrílicas", price: 25.00 },
            { quantity: 1, ticket_desc: "Diseño Cabaña", price: 10.00 }
        ],
        total: 35.00
    };

    const dataToPrint = ticketData || defaultData;

    // --- 1. LÓGICA DE CONEXIÓN ---

    // Inicializar y buscar dispositivos ya permitidos al cargar
    useEffect(() => {
        const init = async () => {
            if (navigator.usb) {
                const devices = await navigator.usb.getDevices();
                if (devices.length > 0) {
                    await connectToDevice(devices[0]);
                }
                navigator.usb.addEventListener('disconnect', handleDisconnect);
            }
        };

        init();

        return () => {
            if (navigator.usb) {
                navigator.usb.removeEventListener('disconnect', handleDisconnect);
            }
        };
    }, []);

    const handleDisconnect = (event) => {
        if (device && event.device === device) {
            setStatus('Desconectado (Dispositivo retirado)');
            setDevice(null);
        }
    };

    const connectToDevice = async (usbDevice) => {
        try {
            await usbDevice.open();
            await usbDevice.selectConfiguration(1);
            await usbDevice.claimInterface(0);
            setDevice(usbDevice);
            setStatus(`Conectado a: ${usbDevice.productName}`);
            setError('');
            return true;
        } catch (err) {
            debugger;
            console.error("Error de conexión:", err);
            if (err.name === 'SecurityError') {
                setPrinterError("Acceso denegado: Cambia el driver a WinUSB con Zadig.");
            } else if (err.message.includes('An operation that changes the device state')) {
                setStatus('busy'); // Alguien más la tiene (Amarillo/Rojo)
            } else {
                if (err.message && !err.message.includes('open')) {
                    setStatus('Error de conexión');
                    setDevice(null);
                    return false;
                }
                // Si ya estaba abierto, asumimos que está bien
                setDevice(usbDevice);
                setStatus(`Reconectado a: ${usbDevice.productName}`);
                return true;
                // setPrinterError("Error: " + err.message);
            }
            // Ignoramos el error de "device already open" para no bloquear

        }
    };

    const requestNewDevice = async () => {
        try {
            const selectedDevice = await navigator.usb.requestDevice({ filters: [] });
            await connectToDevice(selectedDevice);
        } catch (err) {
            setError('Error al solicitar dispositivo: ' + err.message);
        }
    };

    // Función crítica: Intenta recuperar la conexión antes de imprimir
    const ensureConnection = async () => {
        if (device && device.opened) return true;

        // Si tenemos el objeto device pero se cerró
        if (device && !device.opened) {
            return await connectToDevice(device);
        }

        // Si no tenemos device, buscamos en los permitidos
        const devices = await navigator.usb.getDevices();
        if (devices.length > 0) {
            return await connectToDevice(devices[0]);
        }

        return false;
    };

    // --- 2. PROCESAMIENTO DE IMAGEN ---
    const processImageOnCanvas = (url, targetWidth) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            img.onload = () => {
                const aspectRatio = img.height / img.width;
                const targetHeight = Math.floor(targetWidth * aspectRatio);
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    resolve(canvas);
                } else {
                    reject(new Error("No context"));
                }
            };
            img.onerror = () => reject(new Error('Error cargando imagen del ticket'));
        });
    };

    // --- 3. FORMATEO DE TEXTO (32 CARACTERES) ---
    const generateLine = (qty, desc, price) => {
        const qtyStr = `${qty}x`; // "1x"
        const priceStr = `$${Number(price).toFixed(2)}`; // "$25.00"

        // Recortamos la descripción a 15 caracteres
        const cleanDesc = (desc || "Producto").substring(0, 15).trim();

        // Estructura: "1x " + "Producto"
        const leftPart = `${qtyStr} ${cleanDesc}`;

        // Calculamos espacios necesarios
        // 32 (ancho total) - izquierda - precio
        const spaceCount = 32 - leftPart.length - priceStr.length;
        const spaces = ' '.repeat(Math.max(0, spaceCount));

        return `${leftPart}${spaces}${priceStr}\n`;
    };

    // --- 4. IMPRESIÓN ---
    const handlePrint = async () => {
        setIsPrinting(true);
        setError('');

        try {
            // A) Verificar conexión
            const isConnected = await ensureConnection();
            if (!isConnected) {
                throw new Error("Impresora desconectada. Por favor, reconecta.");
            }

            if (!device) throw new Error("No hay dispositivo asignado.");

            // B) Preparar Imagen (Logo)
            let imgCanvas;
            try {
                // Asegúrate que esta imagen exista en public/brillarte-bloom/logo_ticket-bw.png
                imgCanvas = await processImageOnCanvas('/brillartebloom/logo_ticket-bw.png', 304);
            } catch (e) {
                console.warn("No se pudo cargar el logo, imprimiendo sin logo.");
            }

            // C) Encoder
            const encoder = new EscPosEncoder({
                width: 32,
                imageMode: 'raster',
                codepageMapping: 'xprinter'
            });

            let printJob = encoder
                .initialize()
                .codepage('cp850')
                .raw([0x1B, 0x33, 20]); // Interlineado compacto

            // Logo si existe
            if (imgCanvas) {
                printJob = printJob
                    .align('center')
                    .image(imgCanvas, imgCanvas.width, imgCanvas.height, 'atkinson');
            }

            // Cabecera
            printJob = printJob
                .newline()
                .bold(true)
                .text(`${dataToPrint.businessName}\n`)
                .bold(false)
                .align('left')
                .text(`Fecha: ${dataToPrint.date}\n`)
                .text('--------------------------------\n');

            // Items Dinámicos
            if (dataToPrint.items && dataToPrint.items.length > 0) {
                dataToPrint.items.forEach(item => {
                    const line = generateLine(item.quantity, item.ticket_desc || item.name, item.price);
                    printJob = printJob.text(line);
                });
            }

            // Totales y Footer
            printJob = printJob
                .text('--------------------------------\n')
                .align('right')
                .bold(true)
                .text(`TOTAL: $${Number(dataToPrint.total).toFixed(2)}\n`)
                .bold(false)
                .newline()
                .align('center')
                .text('¡Gracias por su visita!\n')
                .text('Que tenga un lindo día\n')
                .newline()
                .newline()
                .newline()
                .cut()
                .pulse(); // Abrir cajón

            const result = printJob.encode();

            // Enviar datos
            const interfaceData = device.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            if (!endpoint) throw new Error("Endpoint no encontrado");

            await device.transferOut(endpoint.endpointNumber, result);
            console.log("Impresión exitosa");

        } catch (err) {
            console.error(err);
            setError(err.message || "Error desconocido al imprimir");
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="p-4 border rounded-lg bg-gray-50 max-w-md mx-auto mt-4 font-sans text-sm">
            <h2 className="text-lg font-bold mb-2 text-gray-800">Estado de Impresora</h2>

            <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${device ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-gray-600 font-medium">{status}</span>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-xs">
                    {error}
                </div>
            )}

            <div className="flex gap-2 flex-col sm:flex-row">
                {!device && (
                    <button
                        onClick={requestNewDevice}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded shadow transition-colors"
                    >
                        🔍 Buscar Impresora
                    </button>
                )}

                <button
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className={`flex-1 px-4 py-2 text-white rounded shadow transition-all flex justify-center items-center gap-2
                        ${isPrinting
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    {isPrinting ? 'Imprimiendo...' : '🖨️ Imprimir Ticket'}
                </button>
            </div>

            <p className="mt-4 text-xs text-gray-400 text-center">
                Asegúrate de que la impresora tenga papel de 58mm.
            </p>
        </div>
    );
}
'use client';
import { useState, useEffect } from 'react';
import EscPosEncoder from 'esc-pos-encoder';

export default function WebUsbPrinter() {


    const processImageOnCanvas = (url, targetWidth) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;

            img.onload = () => {
                // 1. Calculamos la altura proporcional
                const aspectRatio = img.height / img.width;
                const targetHeight = Math.floor(targetWidth * aspectRatio);

                // 2. Creamos un canvas invisible del tamaño EXACTO que queremos
                const canvas = document.createElement('canvas');
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext('2d');
                // Dibujamos la imagen estirándola al tamaño del canvas
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

                // 3. Devolvemos el canvas (la librería acepta canvas o imágenes)
                resolve(canvas);
            };

            img.onerror = (err) => reject(new Error('No se pudo cargar la imagen: ' + url));
        });
    };

    const printTicket2 = async () => {
        if (!device) return;

        try {
            // 1. Preparamos la imagen (304px es un buen ancho para raster)
            const imgCanvas = await processImageOnCanvas('/brillartebloom/logo_ticket-bw.png', 304);

            // 2. AQUÍ ESTÁ LA CORRECCIÓN BASADA EN TU DOCUMENTACIÓN
            const encoder = new EscPosEncoder({
                width: 32,               // Le decimos: "Oye, soy papel pequeño (58mm)"
                imageMode: 'raster',     // Modo compatible para impresoras genéricas
                codepageMapping: 'xprinter' // Mapeo de caracteres para clones chinos (ayuda con la Ñ)
            });


            const result = encoder
                .initialize()
                .codepage('cp850') // Activamos el idioma español

                // Ajuste manual de interlineado (esto sigue siendo necesario para compactar)
                .raw([0x1B, 0x33, 20])

                // LOGO
                .align('center')
                .image(imgCanvas, imgCanvas.width, imgCanvas.height, 'atkinson')

                // TEXTO
                .newline()
                .bold(true)
                .text('Brillarte Bloom\n') // Al tener width:32, el align center ahora sí será real
                .bold(false)

                .align('left')
                .text('Fecha: 01/02/2026\n')
                .text('--------------------------------\n')
                // ARTÍCULOS (Ajustados a 32 caracteres de ancho)
                // "Uñas Acrílicas" (14) + 11 espacios + "$25.00" (6) = 31 chars
                .text('1x Uñas Acrílicas         $25.00\n')
                // "Diseño Cabaña" (13) + 12 espacios + "$10.00" (6) = 31 chars
                .text('1x Diseño Cabaña          $10.00\n')

                .text('--------------------------------\n')

                .align('right')
                .bold(true)
                .text('TOTAL: $35.00\n')
                .bold(false)

                .align('center')
                .newline()
                .text('¡Gracias por su visita!\n')

                .newline()
                .newline()
                .cut()     // Si tu impresora tiene corte
                .pulse()   // Abre el cajón (pin 0 por defecto según la doc)
                .encode();

            const interfaceData = device.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            await device.transferOut(endpoint.endpointNumber, result);
            console.log("Impresión optimizada enviada ✅");

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
        }
    };

    const [device, setDevice] = useState(null);
    const [status, setStatus] = useState('Desconectado');
    const [error, setError] = useState('');


    const openCashDrawer = async () => {
        if (!device) return;
        const encoder = new TextEncoder();

        // LISTA DE COMANDOS A PROBAR
        const attempts = [
            // INTENTO 1: Estándar PIN 2 (Hex 00) - Pulso más largo (100ms)
            // A veces 50ms (0x19) es muy poco para mover el solenoide
            '\x1B\x70\x00\x19\xFA',

        ];

        try {
            const interfaceData = device.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            // Enviamos TODOS los comandos uno tras otro
            console.log("Enviando ráfaga de intentos de apertura...");

            // Concatenamos todos en una sola ráfaga para asegurar que alguno pegue
            const allCommands = attempts.join('\x0A\x0A'); // Separados por saltos de línea
            const data = encoder.encode(allCommands);

            await device.transferOut(endpoint.endpointNumber, data);

        } catch (err) {
            console.error('Error enviando ráfaga:', err);
        }
    };

    const ESC_POS = {
        INIT: '\x1B\x40',          // Inicializar impresora
        TEXT_CENTER: '\x1B\x61\x01', // Centrar texto
        TEXT_LEFT: '\x1B\x61\x00',   // Texto a la izquierda
        BOLD_ON: '\x1B\x45\x01',     // Negrita activada
        BOLD_OFF: '\x1B\x45\x00',    // Negrita desactivada
        CUT: '\x1D\x56\x42\x00',     // Cortar papel (si la impresora tiene corte)
        LINE_FEED: '\x0A',           // Salto de línea
        OPEN_DRAWER_PIN2: '\x1B\x70\x00\x19\xFA', // Opción A (La más común)
        OPEN_DRAWER_PIN5: '\x1B\x70\x01\x19\xFA', // Opción B (Si la A no va)
    };

    // 1. Conectar y solicitar permiso al usuario
    const connectPrinter = async () => {
        try {
            setError('');
            // Solicita un dispositivo USB. 
            // filters: [] permite ver todos los dispositivos para elegir la impresora.
            const selectedDevice = await navigator.usb.requestDevice({
                filters: []
            });

            await selectedDevice.open();

            // Seleccionar configuración #1 (estándar)
            await selectedDevice.selectConfiguration(1);

            // Reclamar la interfaz (Aquí es donde falla si Windows tiene el driver oficial)
            await selectedDevice.claimInterface(0);

            setDevice(selectedDevice);
            setStatus(`Conectado a: ${selectedDevice.productName}`);
        } catch (err) {
            console.error(err);
            setError('Error al conectar: ' + err.message);
        }
    };

    // useEffect(() => {
    //     console.log(device);
    //     // Esta función busca dispositivos ya permitidos
    //     const autoConnect = async () => {

    //         // getDevices() devuelve una lista de dispositivos con permiso previo
    //         const devices = await navigator.usb.getDevices();

    //         if (devices.length > 0) {
    //             for (const device of devices) {
    //                 try {
    //                     console.log("Dispositivo conocido encontrado, reconectando...");
    //                     const savedDevice = device; // Tomamos la primera impresora que encuentre

    //                     // Repetimos el proceso de conexión
    //                     await savedDevice.open();
    //                     await savedDevice.selectConfiguration(1);
    //                     await savedDevice.claimInterface(0);

    //                     setDevice(savedDevice);
    //                     setStatus(`Reconectado a: ${savedDevice.productName}`);
    //                 } catch (err) {
    //                     console.log("No se pudo reconectar automáticamente:", err);
    //                 }
    //             }
    //         }

    //     };

    //     autoConnect();
    // }, []);

    // 2. Función para imprimir el Ticket
    const printTicket = async () => {
        if (!device) return;

        try {
            // Construimos el contenido del ticket concatenando comandos y texto
            // Nota: El texto debe codificarse para que acepte acentos, 
            // pero para esta prueba usaremos texto plano simple.
            let commands =
                ESC_POS.INIT +
                ESC_POS.TEXT_CENTER +
                ESC_POS.BOLD_ON + "Brillarte Bloom\n" + ESC_POS.BOLD_OFF +
                ESC_POS.TEXT_LEFT +
                "Fecha: 01/02/2026\n" +
                "--------------------------------\n" +
                "Producto          Precio\n" +
                "--------------------------------\n" +
                "1x Uñas Acrilicas      $25.00\n" +
                "--------------------------------\n" +
                ESC_POS.BOLD_ON + "TOTAL:                 $25.00\n" + ESC_POS.BOLD_OFF +
                ESC_POS.LINE_FEED +
                ESC_POS.TEXT_CENTER +
                "Gracias por su visita!\n" +
                ESC_POS.BOLD_ON + ESC_POS.TEXT_CENTER +
                "CULA SI NO VUELVES\n" + ESC_POS.BOLD_OFF +
                ESC_POS.LINE_FEED +
                ESC_POS.LINE_FEED +
                ESC_POS.LINE_FEED + // Espacio para que salga el papel
                ESC_POS.CUT +
                ESC_POS.OPEN_DRAWER_PIN2;

            // Convertir el string a Uint8Array para enviarlo por USB
            const encoder = new TextEncoder();
            const data = encoder.encode(commands);

            // Encontrar el "Endpoint" de salida (OUT)
            // Usualmente es el endpoint #1 o #2, pero lo buscamos dinámicamente
            const interfaceData = device.configuration.interfaces[0];
            const endpoint = interfaceData.alternates[0].endpoints.find(e => e.direction === 'out');

            if (!endpoint) throw new Error('No se encontró endpoint de escritura');

            // Enviar datos
            await device.transferOut(endpoint.endpointNumber, data);

        } catch (err) {
            setError('Error imprimiendo: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
            <h1>Prueba WebUSB (Modo Directo)</h1>

            <div style={{ marginBottom: '20px' }}>
                Estado: <strong>{status}</strong>
            </div>

            {error && (
                <div style={{ color: 'red', marginBottom: '20px', padding: '10px', background: '#ffe6e6' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={connectPrinter}
                    disabled={!!device}
                    style={{ padding: '10px 20px', background: '#0070f3', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                >
                    1. Conectar Impresora
                </button>

                <button
                    onClick={printTicket}
                    disabled={!device}
                    style={{ padding: '10px 20px', background: device ? 'green' : '#ccc', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                >
                    2. Imprimir Ticket
                </button>
                <button
                    onClick={printTicket2}
                    disabled={!device}
                    style={{ padding: '10px 20px', background: device ? 'green' : '#ccc', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                >
                    3. Imprimir Ticket 2
                </button>
                <button
                    onClick={openCashDrawer}
                    disabled={!device}
                    style={{ padding: '10px 20px', background: device ? 'green' : '#ccc', color: 'white', borderRadius: '5px', border: 'none', cursor: 'pointer' }}
                >
                    4. Abrir Cajón
                </button>
            </div>

            <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
                Nota: Si recibes error "SecurityError" o "ClaimInterface", es probable que necesites cambiar el driver con Zadig.
            </p>
        </div>
    );
}

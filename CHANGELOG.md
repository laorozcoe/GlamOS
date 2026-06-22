# Changelog

## MercadoPago Point, neto real y permisos

Conjunto de cambios enfocados en: integración real con la terminal MercadoPago Point,
visibilidad del **dinero neto** que entra a la cuenta, un permiso para ocultar datos del
cliente, y mejoras de UX consistentes en dashboard, ventas y calendario.

### 💳 Terminal MercadoPago Point (cobro con tarjeta)

- **Formato de cobro corregido** (`api/mp/payment-intent`): el monto va en **centavos** (entero),
  con mínimo de **$5**, y se eliminaron los campos `description`/`payment` que la API ya no acepta.
- **Cancelación corregida**: ahora se cancela el intent específico (`/payment-intents/{id}`).
  Si el cobro ya está `ON_TERMINAL`, MP responde 409 → solo se cancela desde el dispositivo físico
  (el modal lo informa).
- **Estados y validación de conexión** en `PaymentModal`: nuevo estado `connecting` (intent `OPEN`),
  y si la terminal no responde en ~21 s se avisa y se permite **reintentar** (la terminal se conecta
  por internet a la nube de MP, no por Bluetooth).
- **Configuración de terminales** (`/settings`): botón **"Detectar de MercadoPago"** que lista las
  terminales reales de la cuenta con su modo (`PDV`/`STANDALONE`), permite **activar PDV** o
  **volver a STANDALONE** (con confirmación), e importar una terminal con su `device_id`.
- **Selección en el cobro**: se preselecciona la terminal **predeterminada**; con 2+ terminales hay
  dropdown para cambiarla.
- **Modo por terminal guardada**: la tabla de terminales muestra una columna **Conexión** con el modo
  actual (PDV/Standalone) y un botón para alternarlo por fila. Los modos se detectan automáticamente
  al abrir Configuración (si hay Access Token), sin tener que pulsar "Detectar" cada vez.
- **Modo simulación** (`MP_SIMULATE=true`, solo desarrollo): permite probar todo el flujo sin
  terminal física. Apagado por defecto.
- **Finalización automática del cobro con tarjeta**: al aprobarse en la terminal, la venta se
  guarda sola (registra venta + pagos, imprime ticket, refresca y cierra) tras un breve "aprobado",
  para que nadie se quede sin presionar "Confirmar". El footer muestra "Guardando venta..." y ya no
  permite Cancelar un cobro ya realizado. Efectivo/transferencia siguen confirmándose manualmente.
- **Flujo de cobro unificado (simplificación)**: con tarjeta + terminal ya NO existe el botón
  "Agregar Pago" (que registraba un pago sin cobrar). Ahora hay un único botón **"Cobrar $X en
  terminal"** que siempre cobra de verdad. Soporta **pago parcial** (ej. $5 con tarjeta del total
  de $10 y el resto en efectivo). Efectivo/transferencia conservan "Agregar Pago".
- **Fix crítico — pagos rechazados ya no crean ventas falsas**: el intent puede llegar a `FINISHED`
  aunque el pago esté **rechazado** (neto $0). Antes esto generaba una venta "pagada" sin cobro real
  (mostrando comisión = total). Ahora la ruta de polling verifica `payData.status === 'approved'`;
  si no, devuelve `ERROR` y el modal muestra *"Pago rechazado por el banco. No se cobró nada"* sin
  registrar venta.

### 💰 Dinero neto real (comisión + IVA)

- Se captura y guarda por venta: `mpNetReceived` (neto real), `mpFee`, `mpTaxes`, `mpReleaseDate`,
  desde el objeto `payment` de MercadoPago (`transaction_details.net_received_amount`).
- **Webhook** `/api/mp/webhook` (ruta pública, validación de firma `x-signature` con
  `Business.mpWebhookSecret`): concilia el neto real cuando MP confirma el pago.
  URL: `https://DOMINIO/api/mp/webhook?businessId=<ID>`.
- **Página de Liquidaciones** (`/settlements`, admin): resumen confiable del periodo desde la BD
  (cobrado / comisión / neto) + generación, auto-refresco y descarga del **reporte oficial de
  liquidaciones** de MercadoPago (fuente de verdad del depósito al banco).
- **Neto como valor dominante** en toda la app para evitar confusiones:
  - Dashboard: "Ingreso Neto Hoy" y "Tarjeta (neto)"; las cards suman al neto total.
  - Cards por empleada: el número grande es el **neto**; la fila Tarjeta muestra el neto (bruto tachado).
  - Historial de ventas (lista y detalle) y modal del calendario: neto destacado + bruto/comisión.

### 🔐 Permiso: ocultar datos del cliente

- Nuevo permiso `Employee.canViewClientData`. Cuando está desactivado, el empleado (manicurista)
  **no ve nombre/teléfono del cliente**: se ocultan en `BookingModal`, `SaleDetailsModal`,
  `MultiCheckoutModal` y en el título de la cita del calendario. ADMIN y RECEPTION siempre ven.
- Se gestiona en `/permissions` junto al permiso de crear citas.

### 🎨 UX / método de pago

- Badge de **método de pago** con los colores del dashboard (Efectivo=verde, Tarjeta=azul,
  Transferencia=violeta) en el historial de ventas y en el header del modal de cita cobrada.
- Cards del dashboard rediseñadas (alineación consistente de títulos, soporte dark mode).

### 🗄️ Base de datos (Prisma)

- `Sale`: `mpNetReceived`, `mpTaxes`, `mpReleaseDate`.
- `Business`: `mpWebhookSecret`.
- `Employee`: `canViewClientData`.

> Documentación detallada de la integración en [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).
